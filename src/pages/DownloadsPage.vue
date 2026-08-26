<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { ApiService } from 'src/services/api'
import { useNotificationsStore } from 'src/stores/notifications'

const $q = useQuasar()
const notifications = useNotificationsStore()
const loading = ref(false)
const downloadingMusicId = ref(null)
const downloads = ref([])
const search = ref('')

const audio = new Audio()
const currentId = ref(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const loadingPlayMusicId = ref(null)
const playbackUrls = ref({})
const ANDROID_DOWNLOAD_DIR = 'Download/Wavecraft Store'

const isFileMissingError = (error) => {
    const message = String(error?.message || '').toLowerCase()
    const code = String(error?.code || '').toLowerCase()

    return message.includes('not exist')
        || message.includes('no such file')
        || message.includes('notfound')
        || code.includes('not_found')
        || code.includes('enoent')
}

const isFileAlreadyExistsError = (error) => {
    const message = String(error?.message || '').toLowerCase()
    const code = String(error?.code || '').toLowerCase()

    return message.includes('exists')
        || message.includes('already')
        || code.includes('exists')
        || code.includes('eexist')
}

const isNativeAndroid = () => {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
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

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
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
            // Only treat known "file missing" errors as available filename.
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

        // Retry with a new suffix if another process creates the same file between
        // stat and write, or if platform behavior differs across Android versions.
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

                return {
                    filePath,
                    fileName: uniqueName,
                    renamed: uniqueName !== filename,
                }
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
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(objectUrl)

    return {
        filePath: filename,
        fileName: filename,
        renamed: false,
    }
}

const fetchDownloads = async () => {
    loading.value = true

    try {
        const { data } = await ApiService.get('downloads')
        downloads.value = data?.data || []
    } catch (error) {
        console.error(error)
        $q.notify({
            type: 'negative',
            message: error?.response?.data?.message || 'Failed to load your downloads.',
        })
    } finally {
        loading.value = false
    }
}

const filteredDownloads = computed(() => {
    const text = search.value.trim().toLowerCase()

    if (!text) return downloads.value

    return downloads.value.filter((item) => {
        const haystack = [
            item.title,
            item.file_name,
            item.release,
            item.genre,
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

        return haystack.includes(text)
    })
})

const formatDuration = (seconds) => {
    const n = Number(seconds)
    if (!n || Number.isNaN(n)) return '0:00'
    const mins = Math.floor(n / 60)
    const secs = Math.floor(n % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

const rowProgress = (item) => {
    if (currentId.value !== item.music_id) return 0
    if (!duration.value) return 0
    return Math.max(0, Math.min(1, currentTime.value / duration.value))
}

const filenameForItem = (item) => {
    return item.file_name || `track-${item.music_id}.${item.extension || 'mp3'}`
}

const getPlaybackUrl = async (item) => {
    const key = String(item.music_id)
    if (playbackUrls.value[key]) return playbackUrls.value[key]

    const response = await ApiService.download(`downloads/${item.music_id}/file`)
    const blob = new Blob([response.data], {
        type: response?.headers?.['content-type'] || 'audio/mpeg',
    })
    const url = URL.createObjectURL(blob)

    playbackUrls.value = {
        ...playbackUrls.value,
        [key]: url,
    }

    return url
}

const playTrack = async (item) => {
    loadingPlayMusicId.value = item.music_id

    try {
        if (currentId.value === item.music_id) {
            if (isPlaying.value) {
                audio.pause()
                isPlaying.value = false
            } else {
                await audio.play()
                isPlaying.value = true
            }
            return
        }

        const src = await getPlaybackUrl(item)
        audio.src = src
        currentId.value = item.music_id
        currentTime.value = 0
        duration.value = 0
        await audio.play()
        isPlaying.value = true
    } catch (error) {
        console.error(error)
        $q.notify({
            type: 'negative',
            message: error?.response?.data?.message || 'Unable to play this track.',
        })
    } finally {
        loadingPlayMusicId.value = null
    }
}

const seekTrack = (item, event) => {
    if (currentId.value !== item.music_id || !duration.value) return

    const rect = event.currentTarget.getBoundingClientRect()
    const percent = (event.clientX - rect.left) / rect.width
    audio.currentTime = Math.max(0, Math.min(1, percent)) * duration.value
}

const filenameFromHeader = (headerValue) => {
    if (!headerValue) return null

    const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i)
    if (utf8Match?.[1]) {
        return decodeURIComponent(utf8Match[1])
    }

    const simpleMatch = headerValue.match(/filename="?([^";]+)"?/i)
    return simpleMatch?.[1] || null
}

const downloadTrack = async (item) => {
    downloadingMusicId.value = item.music_id

    try {
        const response = await ApiService.download(`downloads/${item.music_id}/file`)
        const headerName = filenameFromHeader(response?.headers?.['content-disposition'])
        const fallbackName = item.file_name || `track-${item.music_id}.${item.extension || 'mp3'}`
        const fileName = headerName || fallbackName

        const blob = new Blob([response.data], {
            type: response?.headers?.['content-type'] || 'application/octet-stream',
        })

        const savedAs = await saveBlobToDevice(blob, fileName)

        $q.notify({
            type: 'positive',
            message: isNativeAndroid()
                ? (savedAs.renamed
                    ? `${item.title} saved as ${savedAs.fileName} (file already existed)`
                    : `${item.title} saved to ${savedAs.filePath}`)
                : `Downloading ${item.title}`,
        })

        notifications.addHistoryEvent({
            eventType: 'download.completed',
            entityId: `${item.music_id}-${Date.now()}`,
            title: 'Audio download completed',
            body: item.title || savedAs.fileName || 'Track download finished',
            raw: {
                musicId: item.music_id,
                fileName: savedAs.fileName,
                filePath: savedAs.filePath,
            },
        })
    } catch (error) {
        console.error(error)
        $q.notify({
            type: 'negative',
            message: error?.response?.data?.message || 'Download failed.',
        })
    } finally {
        downloadingMusicId.value = null
    }
}

audio.ontimeupdate = () => {
    currentTime.value = audio.currentTime || 0
    duration.value = audio.duration || 0
}

audio.onplay = () => {
    isPlaying.value = true
}

audio.onpause = () => {
    isPlaying.value = false
}

audio.onended = () => {
    isPlaying.value = false
}

onUnmounted(() => {
    audio.pause()
    audio.src = ''

    Object.values(playbackUrls.value).forEach((url) => {
        URL.revokeObjectURL(url)
    })
})

onMounted(fetchDownloads)
</script>

<template>
    <q-page class="store-page text-white overflow-hidden">
        <div class="store-header">
            <div class="brand-block">
                <div class="brand-icon">
                    <q-icon name="download" size="18px" color="white" />
                </div>
                <div>
                    <div class="brand-name">My Downloads</div>
                    <div class="brand-sub">Purchased Music Library</div>
                </div>
            </div>

            <div class="header-actions">
                <q-btn flat dense no-caps class="header-btn" icon="refresh" label="Refresh" @click="fetchDownloads" />
            </div>
        </div>

        <div class="filter-bar">
            <div class="filter-search-wrap">
                <q-icon name="search" size="14px" color="grey-6" />
                <q-input v-model="search" borderless dense dark placeholder="Search in your purchased tracks"
                    class="download-search-input" />
            </div>

            <q-chip class="filter-chip" dense>{{ filteredDownloads.length }} track(s)</q-chip>
        </div>

        <div class="track-list-header">
            <span class="col-num">#</span>
            <span></span>
            <span class="col-title">Title</span>
            <span class="col-wave">Playback</span>
            <span class="col-genre">Genre</span>
            <span class="col-price">Paid</span>
            <span></span>
        </div>

        <div v-if="loading" class="flex flex-center q-pa-xl">
            <q-spinner color="primary" size="40px" />
        </div>

        <div v-else-if="filteredDownloads.length" class="track-list">
            <div v-for="(item, index) in filteredDownloads" :key="item.music_id" class="track-row"
                :class="{ 'track-playing': currentId === item.music_id }">
                <span class="col-num">
                    <q-icon v-if="currentId === item.music_id && isPlaying" name="graphic_eq" size="14px"
                        color="purple-4" />
                    <span v-else class="track-num-text">{{ index + 1 }}</span>
                </span>

                <div class="col-play">
                    <q-btn round flat dense class="play-btn"
                        :icon="currentId === item.music_id && isPlaying ? 'pause' : 'play_arrow'"
                        :loading="loadingPlayMusicId === item.music_id" @click="playTrack(item)" />
                </div>

                <div class="col-title">
                    <div class="track-title ellipsis">{{ item.title }}</div>
                    <div class="track-release ellipsis">
                        {{ item.release || 'No Release' }}
                        <span v-if="item.duration"> • {{ item.duration }}</span>
                        <span v-if="item.size"> • {{ item.size }} MB</span>
                    </div>
                    <div class="track-file ellipsis">{{ filenameForItem(item) }}</div>
                </div>

                <div class="col-wave">
                    <div class="waveform-wrapper" @click="seekTrack(item, $event)">
                        <div class="waveform-bg" />
                        <div class="playhead" :style="{ width: `${rowProgress(item) * 100}%` }" />
                    </div>
                    <div class="playback-time" v-if="currentId === item.music_id">
                        {{ formatDuration(currentTime) }} / {{ formatDuration(duration) }}
                    </div>
                </div>

                <div class="col-genre">
                    <span class="genre-tag">{{ item.genre || '—' }}</span>
                </div>

                <div class="col-price">
                    <span class="price-tag">M{{ item.paid_amount }}</span>
                </div>

                <div class="col-action">
                    <q-btn round flat dense icon="download" class="action-btn"
                        :loading="downloadingMusicId === item.music_id" @click="downloadTrack(item)" />
                </div>
            </div>
        </div>

        <div v-else class="empty-state">
            <q-icon name="library_music" size="40px" color="grey-7" />
            <div class="empty-title">No purchased tracks found</div>
            <div class="empty-sub">Complete a music payment, then come back here.</div>
        </div>
    </q-page>
</template>

<style scoped>
.store-page {
    background: #0a0a0f;
    min-height: 100vh;
    padding-bottom: 1.5rem;
}

.store-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border-bottom: 0.5px solid rgba(255, 255, 255, 0.08);
    background: rgba(10, 10, 15, 0.98);
    position: sticky;
    top: 0;
    z-index: 50;
}

.brand-block {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    min-width: 0;
}

.brand-icon {
    width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
    background: #7c3aed;
    display: flex;
    align-items: center;
    justify-content: center;
}

.brand-name {
    font-size: 0.9rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: #f3f4f6;
}

.brand-sub {
    font-size: 0.65rem;
    color: #4b5563;
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.header-btn {
    background: rgba(255, 255, 255, 0.05) !important;
    border: 0.5px solid rgba(255, 255, 255, 0.1) !important;
    color: #9ca3af !important;
    border-radius: 0.5rem !important;
    font-size: 0.75rem !important;
    padding: 0.375rem 0.8rem !important;
}

.filter-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-bottom: 0.5px solid rgba(255, 255, 255, 0.06);
    background: rgba(12, 12, 18, 0.95);
}

.filter-search-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.04);
    border: 0.5px solid rgba(255, 255, 255, 0.09);
    border-radius: 0.5rem;
    padding: 0.15rem 0.65rem;
    min-width: min(100%, 14rem);
    flex: 1 1 14rem;
}

.download-search-input {
    width: 100%;
}

.filter-chip {
    background: rgba(255, 255, 255, 0.05) !important;
    border: 0.5px solid rgba(255, 255, 255, 0.09) !important;
    color: #6b7280 !important;
    border-radius: 0.5rem !important;
    font-size: 0.7rem !important;
}

.track-list-header,
.track-row {
    display: grid;
    grid-template-columns: 2rem 2.5rem minmax(0, 1fr) minmax(8rem, 10rem) minmax(4.5rem, 5rem) minmax(4rem, 4.5rem) 2.25rem;
    align-items: center;
    gap: 0.75rem;
    padding: 0 1rem;
}

.track-list-header {
    padding: 0.5rem 1rem 0.7rem;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #374151;
    border-bottom: 0.5px solid rgba(255, 255, 255, 0.05);
}

.track-list {
    padding: 0.75rem 0.25rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.track-row {
    padding: 0.7rem 1rem;
    background: rgba(255, 255, 255, 0.025);
    border: 0.5px solid rgba(255, 255, 255, 0.06);
    border-radius: 0.7rem;
    transition: all 0.18s;
    margin: 0 0.25rem;
}

.track-row:hover {
    background: rgba(124, 58, 237, 0.07);
    border-color: rgba(124, 58, 237, 0.2);
}

.track-row.track-playing {
    background: rgba(124, 58, 237, 0.1);
    border-color: rgba(124, 58, 237, 0.35);
}

.col-num {
    font-size: 0.7rem;
    color: #4b5563;
    text-align: center;
}

.track-num-text {
    font-variant-numeric: tabular-nums;
}

.play-btn {
    width: 2.25rem !important;
    height: 2.25rem !important;
    background: rgba(255, 255, 255, 0.05) !important;
    border: 0.5px solid rgba(255, 255, 255, 0.09) !important;
    color: #9ca3af !important;
}

.track-playing .play-btn {
    background: rgba(124, 58, 237, 0.22) !important;
    border-color: rgba(124, 58, 237, 0.45) !important;
    color: #c4b5fd !important;
}

.col-title {
    min-width: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.track-title {
    font-size: 0.82rem;
    font-weight: 600;
    color: #e5e7eb;
}

.track-release,
.track-file {
    font-size: 0.7rem;
    color: #4b5563;
    margin-top: 0.15rem;
}

.waveform-wrapper {
    position: relative;
    height: 1.6rem;
    border-radius: 0.45rem;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.04);
    cursor: pointer;
    border: 0.5px solid rgba(255, 255, 255, 0.06);
}

.waveform-bg {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(90deg,
            rgba(255, 255, 255, 0.15) 0,
            rgba(255, 255, 255, 0.15) 2px,
            transparent 2px,
            transparent 6px),
        linear-gradient(90deg, rgba(124, 58, 237, 0.06), rgba(124, 58, 237, 0.16));
    opacity: 0.75;
}

.playhead {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 10;
    background: rgba(124, 58, 237, 0.28);
    border-right: 2px solid #a78bfa;
    transition: width 0.05s linear;
}

.playback-time {
    font-size: 0.63rem;
    color: #9ca3af;
    margin-top: 0.2rem;
}

.genre-tag {
    font-size: 0.65rem;
    color: #6b7280;
    background: rgba(255, 255, 255, 0.05);
    border: 0.5px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.35rem;
    padding: 0.2rem 0.45rem;
}

.price-tag {
    font-size: 0.8rem;
    font-weight: 600;
    color: #34d399;
    text-align: right;
    display: block;
}

.action-btn {
    color: #4b5563 !important;
    background: transparent !important;
    border: 0.5px solid rgba(255, 255, 255, 0.07) !important;
    border-radius: 0.45rem !important;
}

.empty-state {
    min-height: 45vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    color: #9ca3af;
}

.empty-title {
    font-size: 0.95rem;
    color: #d1d5db;
    font-weight: 600;
}

.empty-sub {
    font-size: 0.78rem;
    color: #6b7280;
}

@media (max-width: 900px) {
    .track-list-header {
        display: none;
    }

    .track-row {
        grid-template-columns: 1.6rem 2.2rem minmax(0, 1fr) 2.3rem;
        gap: 0.6rem;
        padding: 0.7rem 0.75rem;
    }

    .col-wave,
    .col-genre,
    .col-price {
        display: none;
    }
}
</style>
