<template>
    <q-card flat :bordered="!isAudio || playing" :class="{ 'task-card-playing': isAudio && playing }">
        <q-card-section class="task-card-section">
            <div class="task-card-main">
                <!-- Play (beat/recording) or Preview (artwork) -->
                <q-btn v-if="isAudio" round color="primary" :icon="playing ? 'pause' : 'play_arrow'"
                    :disable="!task.status" @click="togglePlay" />
                <q-btn v-else round color="primary" icon="image" :disable="!task.status"
                    @click="$emit('details', task)" />

                <div class="task-card-content">
                    <div class="text-subtitle1 task-card-title">{{ task.title }}</div>
                    <div class="text-caption text-grey">
                        {{ serviceLabel }} · {{ formattedDate }}
                    </div>
                    <div class="text-caption" :class="task.is_paid ? 'text-positive' : 'text-warning'">
                        {{ task.is_paid ? 'Paid' : 'Awaiting payment' }}
                        <span v-if="task.amount"> · M{{ task.amount }}</span>
                    </div>

                    <div v-if="isAudio" class="audio-seek-wrap">
                        <q-slider v-model="seekValue" :min="0" :max="duration || 0" :step="0.1"
                            :disable="!task.status || !duration" color="primary" track-size="4px" thumb-size="16px" />
                        <div class="audio-time text-caption text-grey-7">
                            <span>{{ formattedCurrentTime }}</span>
                            <span>{{ formattedDuration }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="task-card-actions">
                <q-badge :color="task.status ? 'positive' : 'grey-6'">
                    {{ task.status ? 'Completed' : 'Processing' }}
                </q-badge>

                <q-btn flat dense label="Details" @click="$emit('details', task)" />

                <q-btn flat round icon="download" :disable="!task.status || downloading" :loading="downloading"
                    @click="download" />
            </div>
        </q-card-section>

        <audio v-if="isAudio" ref="audioEl" :src="mediaUrl" @timeupdate="onTimeUpdate" @loadedmetadata="onLoadedMetadata"
            @play="playing = true" @pause="playing = false" @ended="handleEnded" class="hidden" />
    </q-card>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { useQuasar } from 'quasar'
import { getApiPath } from 'boot/api-config'

const $q = useQuasar()

const ANDROID_DOWNLOAD_DIR = 'Download'

const props = defineProps({ task: { type: Object, required: true } })
defineEmits(['details'])

const stripApiPrefix = (path) => path.replace(/^\/api(?=\/|$)/i, '') || '/'

const getSrc = (task) => {
    if (!task?.file_url) return ''

    if (task.file_url.startsWith('http')) {
        try {
            const absoluteUrl = new URL(task.file_url)
            absoluteUrl.pathname = stripApiPrefix(absoluteUrl.pathname)
            return absoluteUrl.toString()
        } catch {
            return task.file_url.replace('/api/', '/')
        }
    }

    const base = (getApiPath() || '').replace(/\/$/, '')
    const rawPath = task.file_url.startsWith('/') ? task.file_url : `/${task.file_url}`
    const path = stripApiPrefix(rawPath)

    // If no API base is configured, keep the original relative path to avoid runtime crashes.
    return base ? `${base}${path}` : task.file_url
}

const normalizeAbsoluteUrlForDownload = (url) => {
    if (!url) return ''

    try {
        const parsed = new URL(url, window.location.origin)
        parsed.pathname = stripApiPrefix(parsed.pathname)
        return parsed.toString()
    } catch {
        return String(url).replace('/api/', '/')
    }
}

const mediaUrl = computed(() => normalizeAbsoluteUrlForDownload(getSrc(props.task)))

const audioEl = ref(null)
const playing = ref(false)
const downloading = ref(false)
const currentTime = ref(0)
const duration = ref(0)

const isAudio = computed(() => ['beat', 'recording'].includes(props.task.service_type))

const serviceLabel = computed(() => {
    const labels = { beat: 'Beat', recording: 'Recording', artwork: 'Artwork' }
    return labels[props.task.service_type] ?? props.task.service_type
})

const formattedDate = computed(() =>
    new Date(props.task.created_at).toLocaleDateString()
)

const seekValue = computed({
    get: () => currentTime.value,
    set: (value) => seekTo(value)
})

const formattedCurrentTime = computed(() => formatTime(currentTime.value))
const formattedDuration = computed(() => formatTime(duration.value))

function formatTime(value) {
    if (!Number.isFinite(value) || value < 0) return '0:00'
    const wholeSeconds = Math.floor(value)
    const minutes = Math.floor(wholeSeconds / 60)
    const seconds = String(wholeSeconds % 60).padStart(2, '0')
    return `${minutes}:${seconds}`
}

function onLoadedMetadata() {
    duration.value = audioEl.value?.duration || 0
}

function onTimeUpdate() {
    currentTime.value = audioEl.value?.currentTime || 0
}

function seekTo(value) {
    if (!audioEl.value || !Number.isFinite(value)) return
    const max = duration.value || audioEl.value.duration || 0
    const clamped = Math.min(Math.max(value, 0), max)
    audioEl.value.currentTime = clamped
    currentTime.value = clamped
}

function handleEnded() {
    playing.value = false
    currentTime.value = 0
}

async function togglePlay() {
    if (!audioEl.value) return
    if (playing.value) {
        audioEl.value.pause()
        playing.value = false
    } else {
        try {
            await audioEl.value.play()
            playing.value = true
        } catch (e) {
            console.error('Playback failed', e)
            playing.value = false
        }
    }
}

function isNativeAndroid() {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
            // reader.result is "data:<mime>;base64,<data>" — strip the prefix
            const base64 = reader.result.split(',')[1]
            resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}

async function getUniqueAndroidFilename(filename) {
    const dotIndex = filename.lastIndexOf('.')
    const base = dotIndex > -1 ? filename.slice(0, dotIndex) : filename
    const ext = dotIndex > -1 ? filename.slice(dotIndex) : ''

    let candidate = filename
    let counter = 1

    while (true) {
        try {
            await Filesystem.stat({
                directory: Directory.ExternalStorage,
                path: `${ANDROID_DOWNLOAD_DIR}/${candidate}`
            })
            // stat succeeded -> file exists, try next suffix
            candidate = `${base} (${counter})${ext}`
            counter++
            // eslint-disable-next-line no-unused-vars
        } catch (e) {
            // stat throws when the file doesn't exist -> name is free
            return candidate
        }
    }
}

async function saveBlobToDevice(blob, filename) {
    if (isNativeAndroid()) {
        const permission = await Filesystem.requestPermissions()
        if (permission.publicStorage !== 'granted') {
            throw new Error('Storage permission denied')
        }

        await Filesystem.mkdir({
            directory: Directory.ExternalStorage,
            path: ANDROID_DOWNLOAD_DIR,
            recursive: true
        }).catch(() => { }) // already exists is fine

        const uniqueName = await getUniqueAndroidFilename(filename)
        const base64 = await blobToBase64(blob)
        const filePath = `${ANDROID_DOWNLOAD_DIR}/${uniqueName}`

        await Filesystem.writeFile({
            directory: Directory.ExternalStorage,
            path: filePath,
            data: base64,
            recursive: true
        })

        return filePath
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

function inferFilename() {
    const urlPart = (props.task.file_url || mediaUrl.value || '').split('?')[0]
    const extMatch = urlPart.match(/\.[a-zA-Z0-9]+$/)
    const ext = extMatch ? extMatch[0] : (isAudio.value ? '.mp3' : '.jpg')
    const safeTitle = (props.task.title || 'download').replace(/[/\\?%*:|"<>]/g, '-')
    return safeTitle.endsWith(ext) ? safeTitle : `${safeTitle}${ext}`
}

async function download() {
    if (!mediaUrl.value || downloading.value) return
    downloading.value = true
    try {
        const requestUrl = mediaUrl.value
        const response = await fetch(requestUrl)
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`)
        const blob = await response.blob()
        const filename = inferFilename()
        const savedPath = await saveBlobToDevice(blob, filename)

        if (isNativeAndroid()) {
            $q.notify({ type: 'positive', message: `Saved to ${savedPath}` })
        }
    } catch (e) {
        console.error('Download failed', e)
        $q.notify({ type: 'negative', message: 'Download failed' })
    } finally {
        downloading.value = false
    }
}
</script>

<style scoped>
.task-card-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.task-card-main {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    flex: 1 1 auto;
}

.task-card-content {
    min-width: 0;
}

.task-card-title {
    word-break: break-word;
}

.task-card-playing {
    border-color: rgba(25, 118, 210, 0.85);
    box-shadow: 0 0 0 1px rgba(25, 118, 210, 0.22);
}

.audio-seek-wrap {
    margin-top: 6px;
}

.audio-time {
    display: flex;
    justify-content: space-between;
    margin-top: -6px;
}

.task-card-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
}

@media (max-width: 600px) {
    .task-card-section {
        flex-direction: column;
        align-items: stretch;
    }

    .task-card-main {
        align-items: flex-start;
    }

    .task-card-actions {
        width: 100%;
        justify-content: space-between;
    }
}
</style>