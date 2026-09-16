<template>
    <q-card flat bordered :class="{ 'task-card-playing': isAudio && playing }" class="task-card-compact">
        <div class="task-card-grid">
            <!-- Play button — spans both rows -->
            <q-btn v-if="isAudio" round dense color="primary" :icon="playing ? 'pause' : 'play_arrow'"
                :disable="!task.status" size="md" class="task-card-play" @click="togglePlay" />
            <q-btn v-else round dense color="primary" icon="image" :disable="!task.status" size="md"
                class="task-card-play" @click="$emit('details', task)" />

            <!-- Row 1: title -->
            <div class="text-subtitle2 ellipsis task-card-title">{{ task.title }}</div>

            <!-- Row 1: mini player (progress only, no scrubbing) -->
            <div class="task-card-player">
                <q-linear-progress v-if="isAudio" :value="duration ? currentTime / duration : 0" color="primary"
                    size="4px" rounded />
            </div>

            <!-- Row 1: 3-dot menu -->
            <q-btn flat dense round icon="more_vert" size="sm" class="task-card-menu" @click="$emit('details', task)" />

            <div class="text-caption task-card-status" :class="{
                'text-warning': !task.is_paid,
                'text-info': task.is_paid && !task.status,
                'text-positive': task.status
            }">
                {{
                    !task.is_paid
                        ? 'Awaiting payment'
                        : task.status
                            ? 'Completed'
                            : 'Processing'
                }}
            </div>

            <!-- Row 2: date -->
            <div class="text-caption text-grey task-card-date">{{ formattedDate }}

                <q-btn v-if="!task.is_paid" flat dense size="sm" icon="add_shopping_cart" :disable="!canAddToCart"
                    @click="addToCart" />
            </div>
            <!-- Row 2: download -->
            <q-btn flat dense round icon="download" size="sm" class="task-card-download"
                :disable="!task.status || downloading" :loading="downloading" @click="download" />
        </div>

    </q-card>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { useQuasar } from 'quasar'
import { getApiPath } from 'boot/api-config'
import { useCartStore } from 'src/stores/cart'
import {
    sharedCurrentId,
    sharedIsPlaying,
    sharedCurrentTime,
    sharedDuration,
    sharedPlayAudio,
} from 'src/services/audio-player-state'

const $q = useQuasar()
const cart = useCartStore()

// Tasks share the same numeric id space as other entities (music tracks,
// etc.), so this card's "now playing" id is namespaced to avoid colliding
// with a track that happens to have the same numeric id.
const PLAYER_ID_PREFIX = 'task-'

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

const playerId = computed(() => `${PLAYER_ID_PREFIX}${props.task.id}`)
const isThisTrack = computed(() => sharedCurrentId.value === playerId.value)
const playing = computed(() => isThisTrack.value && sharedIsPlaying.value)
const currentTime = computed(() => isThisTrack.value ? sharedCurrentTime.value : 0)
const duration = computed(() => isThisTrack.value ? sharedDuration.value : 0)
const downloading = ref(false)

const isAudio = computed(() => ['beat', 'recording'].includes(props.task.service_type))

// const serviceLabel = computed(() => {
//     const labels = { beat: 'Beat', recording: 'Recording', artwork: 'Artwork' }
//     return labels[props.task.service_type] ?? props.task.service_type
// })

const formattedDate = computed(() =>
    new Date(props.task.created_at).toLocaleDateString()
)

// const seekValue = computed({
//     get: () => currentTime.value,
//     set: (value) => seekTo(value)
// })

// const formattedCurrentTime = computed(() => formatTime(currentTime.value))
// const formattedDuration = computed(() => formatTime(duration.value))
const canAddToCart = computed(() => !props.task.is_paid && Number(props.task.amount) > 0)

function addToCart() {
    if (!canAddToCart.value) return

    const added = cart.addItem({
        id: props.task.id,
        name: props.task.title,
        price: Number(props.task.amount),
        service_type: props.task.service_type,
        type: 'service',
    }, 'service')

    $q.notify({
        type: added ? 'positive' : 'warning',
        message: added
            ? `${props.task.title} added to cart`
            : 'Your cart already contains a different item type',
    })
}

// function formatTime(value) {
//     if (!Number.isFinite(value) || value < 0) return '0:00'
//     const wholeSeconds = Math.floor(value)
//     const minutes = Math.floor(wholeSeconds / 60)
//     const seconds = String(wholeSeconds % 60).padStart(2, '0')
//     return `${minutes}:${seconds}`
// }

function togglePlay() {
    if (!mediaUrl.value) return
    sharedPlayAudio.value?.({
        id: playerId.value,
        title: props.task.title,
        file_src: mediaUrl.value,
    })
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
.task-card-compact {
    width: 100%;
    max-width: 344px;
    height: 80px;
}

.task-card-grid {
    display: grid;
    grid-template-columns: auto 1fr 1fr auto;
    grid-template-rows: 1fr 1fr;
    align-items: center;
    column-gap: 8px;
    row-gap: 2px;
    height: 100%;
    padding: 8px 10px;
}

.task-card-play {
    grid-row: 1 / span 2;
    grid-column: 1;
}

.task-card-title {
    grid-row: 1;
    grid-column: 2;
}

.task-card-player {
    grid-row: 1;
    grid-column: 3;
    min-width: 0;
}

.task-card-menu {
    grid-row: 1;
    grid-column: 4;
}

.task-card-status {
    grid-row: 2;
    grid-column: 2;
}

.task-card-date {
    grid-row: 2;
    grid-column: 3;
}

.task-card-download {
    grid-row: 2;
    grid-column: 4;
}
</style>