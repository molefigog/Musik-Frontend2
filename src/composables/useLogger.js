import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'

const LOG_FILE_NAME = 'app_crash_log.txt'
const MAX_LOG_SIZE_BYTES = 2 * 1024 * 1024 // 2MB before rotating

// On Android, Directory.Documents is the shared/user-visible location (good for
// support/debugging — user or you can pull the file off the device).
// On iOS, Documents is sandboxed but still app-visible via Files app if configured.
// Directory.Data is app-private and always writable without permissions, so it's
// the safe fallback if Documents isn't available (e.g. permission denied).
const PRIMARY_DIRECTORY = Directory.Documents
const FALLBACK_DIRECTORY = Directory.Data

let currentDirectory = PRIMARY_DIRECTORY
let writeQueue = Promise.resolve()
let globalHandlersAttached = false

function normalizeError(error) {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack || null,
        }
    }

    return {
        name: typeof error,
        message: stringifySafe(error),
        stack: null,
    }
}

// Fixed: the old version tracked every object ever visited in a single WeakSet,
// so the SAME object appearing twice in different (non-circular) branches was
// wrongly flagged as "[Circular]" and its data was lost. This version only
// tracks the current ancestor chain, popping objects off as we leave that branch.
function stringifySafe(value) {
    const ancestors = []

    try {
        return JSON.stringify(
            value,
            function (_key, currentValue) {
                if (currentValue instanceof Error) {
                    return {
                        name: currentValue.name,
                        message: currentValue.message,
                        stack: currentValue.stack || null,
                    }
                }

                if (typeof currentValue === 'bigint') {
                    return currentValue.toString()
                }

                if (typeof currentValue === 'object' && currentValue !== null) {
                    // Pop back to the correct depth for this branch
                    while (ancestors.length && ancestors[ancestors.length - 1] !== this) {
                        ancestors.pop()
                    }

                    if (ancestors.includes(currentValue)) {
                        return '[Circular]'
                    }

                    ancestors.push(currentValue)
                }

                return currentValue
            },
            2,
        )
    } catch {
        return String(value)
    }
}

function formatLine(level, message, meta) {
    const parts = [
        `[${new Date().toISOString()}]`,
        `[${level}]`,
        typeof message === 'string' ? message : stringifySafe(message),
    ]

    if (meta !== undefined) {
        parts.push(`meta=${stringifySafe(meta)}`)
    }

    return `${parts.join(' ')}\n`
}

function isMissingFileError(error) {
    const errorMessage =
        (typeof error?.message === 'string' && error.message) ||
        (typeof error === 'string' ? error : '')

    return /does not exist|not found|no such file|enoent/i.test(errorMessage)
}

function isPermissionError(error) {
    const errorMessage =
        (typeof error?.message === 'string' && error.message) ||
        (typeof error === 'string' ? error : '')

    return /permission|denied|not allowed|access/i.test(errorMessage)
}

async function ensureDirectoryExists(directory) {
    try {
        await Filesystem.mkdir({
            path: '',
            directory,
            recursive: true,
        })
    } catch {
        // Already exists or not creatable here — writeFile with recursive:true
        // below will surface the real error if there's a genuine problem.
    }
}

async function writeFirstEntry(directory, line) {
    await ensureDirectoryExists(directory)
    await Filesystem.writeFile({
        path: LOG_FILE_NAME,
        data: line,
        directory,
        recursive: true,
        encoding: 'utf8',
    })
}

async function appendEntry(directory, line) {
    await Filesystem.appendFile({
        path: LOG_FILE_NAME,
        data: line,
        directory,
        encoding: 'utf8',
    })
}

async function rotateIfTooLarge(directory) {
    try {
        const stat = await Filesystem.stat({
            path: LOG_FILE_NAME,
            directory,
        })

        if (stat.size >= MAX_LOG_SIZE_BYTES) {
            await Filesystem.rename({
                from: LOG_FILE_NAME,
                to: `${LOG_FILE_NAME}.old`,
                directory,
                toDirectory: directory,
            }).catch(() => {
                // If rename fails (e.g. .old already exists on some platforms),
                // just delete the old file and try again rather than blocking logging.
                return Filesystem.deleteFile({ path: `${LOG_FILE_NAME}.old`, directory })
                    .catch(() => { })
                    .then(() =>
                        Filesystem.rename({
                            from: LOG_FILE_NAME,
                            to: `${LOG_FILE_NAME}.old`,
                            directory,
                            toDirectory: directory,
                        }),
                    )
            })
        }
    } catch {
        // stat() throws if the file doesn't exist yet — nothing to rotate.
    }
}

async function appendWithDirectoryFallback(line) {
    const triedDirectories = [currentDirectory]

    if (currentDirectory !== FALLBACK_DIRECTORY) {
        triedDirectories.push(FALLBACK_DIRECTORY)
    }

    let lastError

    for (const directory of triedDirectories) {
        try {
            await rotateIfTooLarge(directory)
            await appendEntry(directory, line)
            currentDirectory = directory
            return
        } catch (appendError) {
            if (isMissingFileError(appendError)) {
                try {
                    await writeFirstEntry(directory, line)
                    currentDirectory = directory
                    return
                } catch (writeError) {
                    lastError = writeError
                    continue
                }
            }

            // Permission errors on Documents are common on newer Android versions
            // (scoped storage) — move straight to the fallback directory instead
            // of retrying the same failing directory.
            if (isPermissionError(appendError)) {
                lastError = appendError
                continue
            }

            lastError = appendError
        }
    }

    throw lastError || new Error('Unable to write to any log directory')
}

function enqueueWrite(level, message, meta) {
    const line = formatLine(level, message, meta)

    writeQueue = writeQueue
        .catch(() => {
            // Keep queue alive if a previous write failed.
        })
        .then(() => appendWithDirectoryFallback(line))

    return writeQueue.catch((error) => {
        console.error('[logger] Failed to write log entry', error)
    })
}

function onWindowError(event) {
    enqueueWrite('FATAL', 'Unhandled runtime error', {
        source: 'window.error',
        message: event?.message,
        filename: event?.filename,
        line: event?.lineno,
        column: event?.colno,
        error: normalizeError(event?.error),
    })
}

function onUnhandledRejection(event) {
    enqueueWrite('FATAL', 'Unhandled promise rejection', {
        source: 'window.unhandledrejection',
        reason: normalizeError(event?.reason),
    })
}

function registerGlobalHandlers() {
    if (globalHandlersAttached || typeof window === 'undefined') {
        return
    }

    window.addEventListener('error', onWindowError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)
    globalHandlersAttached = true
}

function registerVueErrorHandler(app) {
    if (!app?.config) {
        return
    }

    const previousHandler = app.config.errorHandler

    app.config.errorHandler = (error, instance, info) => {
        const componentName =
            instance?.$?.type?.name || instance?.$options?.name || instance?.type?.name || 'anonymous'

        enqueueWrite('ERROR', 'Vue error captured', {
            source: 'vue.errorHandler',
            info,
            componentName,
            error: normalizeError(error),
        })

        if (typeof previousHandler === 'function') {
            try {
                previousHandler(error, instance, info)
            } catch (handlerError) {
                enqueueWrite('ERROR', 'Previous Vue error handler threw', {
                    source: 'vue.errorHandler.previous',
                    error: normalizeError(handlerError),
                })
            }
        }
    }
}

export function initLogger(options = {}) {
    const { app, captureGlobalErrors = true } = options

    if (captureGlobalErrors) {
        registerGlobalHandlers()
    }

    if (app) {
        registerVueErrorHandler(app)
    }

    const platform = Capacitor.getPlatform()
    const native = Capacitor.isNativePlatform()

    enqueueWrite('INFO', 'Logger initialized', {
        platform,
        native,
        file: LOG_FILE_NAME,
        primaryDirectory: PRIMARY_DIRECTORY,
        fallbackDirectory: FALLBACK_DIRECTORY,
    })
}

// Returns the full path to the current log file, useful for showing the user
// where to find it (e.g. in a Settings/Support screen) or sharing it.
export async function getLogFileUri() {
    try {
        const result = await Filesystem.getUri({
            path: LOG_FILE_NAME,
            directory: currentDirectory,
        })
        return result.uri
    } catch (error) {
        console.error('[logger] Failed to resolve log file URI', error)
        return null
    }
}

export const logger = {
    log: (message, meta) => enqueueWrite('INFO', message, meta),
    info: (message, meta) => enqueueWrite('INFO', message, meta),
    warn: (message, meta) => enqueueWrite('WARN', message, meta),
    error: (message, meta) => enqueueWrite('ERROR', message, meta),
    debug: (message, meta) => enqueueWrite('DEBUG', message, meta),
    captureException: (error, meta) =>
        enqueueWrite('ERROR', 'Captured exception', {
            ...meta,
            error: normalizeError(error),
        }),
}