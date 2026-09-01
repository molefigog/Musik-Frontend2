import { ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'

const ANDROID_DOWNLOAD_DIR = 'Download/Gw Music'

export function useTrackDownload() {
    const downloadStateByTrack = ref({})

    const isFileMissingError = (error) => {
        const message = String(error?.message || '').toLowerCase()
        const code = String(error?.code || '').toLowerCase()
        return (
            message.includes('not exist') ||
            message.includes('no such file') ||
            message.includes('notfound') ||
            code.includes('not_found') ||
            code.includes('enoent')
        )
    }

    const isFileAlreadyExistsError = (error) => {
        const message = String(error?.message || '').toLowerCase()
        const code = String(error?.code || '').toLowerCase()
        return (
            message.includes('exists') ||
            message.includes('already') ||
            code.includes('exists') ||
            code.includes('eexist')
        )
    }

    const getDownloadState = (trackId) => downloadStateByTrack.value[String(trackId)] || null

    const hasDownloadState = (trackId) => Boolean(getDownloadState(trackId))

    const isDownloading = (trackId) => getDownloadState(trackId)?.status === 'downloading'

    const isDownloadIndeterminate = (trackId) => {
        const state = getDownloadState(trackId)
        return Boolean(state?.status === 'downloading' && state?.totalBytes === 0)
    }

    const downloadProgressValue = (trackId) => {
        const percent = Number(getDownloadState(trackId)?.progress || 0)
        return Math.max(0, Math.min(1, percent / 100))
    }

    const downloadStatusLabel = (trackId) => {
        const state = getDownloadState(trackId)
        if (!state) return ''
        if (state.status === 'downloading') {
            return state.totalBytes > 0
                ? `Downloading ${Math.round(state.progress)}%`
                : `Downloading ${(state.loadedBytes / (1024 * 1024)).toFixed(2)} MB`
        }
        if (state.status === 'done') return 'Download complete'
        if (state.status === 'error') return 'Download failed'
        return ''
    }

    const setDownloadState = (trackId, next) => {
        const key = String(trackId)
        downloadStateByTrack.value = {
            ...downloadStateByTrack.value,
            [key]: {
                ...(downloadStateByTrack.value[key] || {}),
                ...next,
            },
        }
    }

    const getTrackDownloadUrl = (track) => {
        const src = String(track?.file_src || '')
        if (!src) return ''
        if (src.startsWith('http://') || src.startsWith('https://')) return src
        const base = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
        const path = src.startsWith('/') ? src : `/${src}`
        return `${base}${path}`
    }

    const getTrackDownloadName = (track) => {
        if (track?.file_name) return String(track.file_name)
        const extension = String(track?.extension || '').replace(/^\./, '')
        const safeTitle = String(track?.title || 'track')
            .replace(/[^a-zA-Z0-9-_ ]/g, '')
            .trim()
            .replace(/\s+/g, '_')
        return extension ? `${safeTitle || 'track'}.${extension}` : `${safeTitle || 'track'}.mp3`
    }

    const splitFilename = (filename) => {
        const name = String(filename || 'track.mp3').trim() || 'track.mp3'
        const dotIndex = name.lastIndexOf('.')
        if (dotIndex <= 0 || dotIndex === name.length - 1) {
            return { stem: name, ext: '' }
        }
        return {
            stem: name.slice(0, dotIndex),
            ext: name.slice(dotIndex),
        }
    }

    const blobToBase64 = (blob) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => {
                const result = String(reader.result || '')
                const [, base64 = ''] = result.split(',')
                resolve(base64)
            }
            reader.onerror = () => {
                reject(reader.error || new Error('Failed to read blob'))
            }
            reader.readAsDataURL(blob)
        })

    const isNativeAndroid = () => {
        return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
    }

    const getUniqueAndroidFilename = async (filename) => {
        const { stem, ext } = splitFilename(filename)
        for (let i = 0; i < 1000; i += 1) {
            const candidate = i === 0 ? `${stem}${ext}` : `${stem} (${i})${ext}`
            const candidatePath = `${ANDROID_DOWNLOAD_DIR}/${candidate}`
            try {
                await Filesystem.stat({
                    directory: Directory.ExternalStorage,
                    path: candidatePath,
                })
            } catch (error) {
                if (isFileMissingError(error)) {
                    return candidate
                }
                throw error
            }
        }
        return `${stem}_${Date.now()}${ext}`
    }

    const saveBlobToDevice = async (blob, filename) => {
        if (isNativeAndroid()) {
            await Filesystem.requestPermissions()
            await Filesystem.mkdir({
                directory: Directory.ExternalStorage,
                path: ANDROID_DOWNLOAD_DIR,
                recursive: true,
            })
            const base64 = await blobToBase64(blob)
            for (let attempt = 0; attempt < 5; attempt += 1) {
                const uniqueName = await getUniqueAndroidFilename(filename)
                const filePath = `${ANDROID_DOWNLOAD_DIR}/${uniqueName}`
                try {
                    await Filesystem.writeFile({
                        directory: Directory.ExternalStorage,
                        path: filePath,
                        data: base64,
                        recursive: true,
                    })
                    return filePath
                } catch (error) {
                    if (isFileAlreadyExistsError(error) && attempt < 4) {
                        continue
                    }
                    throw error
                }
            }
            throw new Error('Unable to resolve unique Android filename')
        }
        const objectUrl = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = objectUrl
        anchor.download = filename
        anchor.rel = 'noopener'
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        window.setTimeout(() => {
            URL.revokeObjectURL(objectUrl)
        }, 2500)
        return filename
    }

    return {
        downloadStateByTrack,
        getDownloadState,
        hasDownloadState,
        isDownloading,
        isDownloadIndeterminate,
        downloadProgressValue,
        downloadStatusLabel,
        setDownloadState,
        getTrackDownloadUrl,
        getTrackDownloadName,
        isNativeAndroid,
        saveBlobToDevice,
    }
}
