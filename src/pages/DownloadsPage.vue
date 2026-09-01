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
    <q-page class="text-white overflow-hidden">
        <!-- HEADER -->
        <q-toolbar class="bg-grey-10 q-px-md q-py-sm border-bottom">
            <div class="row items-center q-gutter-sm">
                <q-icon name="download" size="18px" />
                <div>
                    <div class="text-subtitle1 text-weight-bold">My Downloads</div>
                    <div class="text-caption text-grey-4">Purchased Music Library</div>
                </div>
            </div>
            <q-space />
            <q-btn flat dense no-caps icon="refresh" label="Refresh" @click="fetchDownloads" />
        </q-toolbar>

        <!-- FILTER BAR -->
        <q-toolbar class="bg-grey-10 q-px-md q-py-sm">
            <q-input v-model="search" borderless dense dark placeholder="Search in your purchased tracks" class="col"
                prefix-icon="search" />
            <q-chip dense color="primary" text-color="white">{{ filteredDownloads.length }} track(s)</q-chip>
        </q-toolbar>

        <!-- COLUMN HEADERS (Desktop only) -->
        <q-toolbar class="gt-xs text-grey-6 text-caption bg-grey-10 q-px-md">
            <span style="flex: 0 0 40px">#</span>
            <span style="flex: 0 0 40px"></span>
            <span style="flex: 1">Title</span>
            <span style="flex: 1">Playback</span>
            <span style="flex: 0 0 100px">Genre</span>
            <span style="flex: 0 0 100px">Paid</span>
            <span style="flex: 0 0 40px"></span>
        </q-toolbar>

        <!-- LOADING -->
        <div v-if="loading" class="q-pa-xl flex flex-center">
            <q-spinner color="primary" size="40px" />
        </div>

        <!-- TRACK LIST -->
        <q-list v-else-if="filteredDownloads.length" separator>
            <q-item v-for="(item, index) in filteredDownloads" :key="item.music_id">
                <template #default>
                    <div class="row full-width items-center q-gutter-md">
                        <!-- Number/Icon -->
                        <div style="flex: 0 0 40px" class="text-center">
                            <q-icon v-if="currentId === item.music_id && isPlaying" name="graphic_eq" size="14px"
                                color="purple-4" />
                            <span v-else class="text-caption">{{ index + 1 }}</span>
                        </div>

                        <!-- Play Button -->
                        <q-btn round flat dense size="sm"
                            :icon="currentId === item.music_id && isPlaying ? 'pause' : 'play_arrow'"
                            :loading="loadingPlayMusicId === item.music_id" @click="playTrack(item)" />

                        <!-- Title & Info -->
                        <div class="col column q-gutter-xs" style="min-width: 0">
                            <div class="text-subtitle2 text-weight-medium ellipsis">{{ item.title }}</div>
                            <div class="text-caption text-grey-5 ellipsis">
                                {{ item.release || 'No Release' }}
                                <span v-if="item.duration"> • {{ item.duration }}</span>
                                <span v-if="item.size"> • {{ item.size }} MB</span>
                            </div>
                            <div class="text-caption text-grey-6 ellipsis">{{ filenameForItem(item) }}</div>
                        </div>

                        <!-- Waveform (Desktop) -->
                        <div class="col gt-xs cursor-pointer" style="min-width: 100px" @click="seekTrack(item, $event)">
                            <div class="bg-grey-9"
                                style="height: 30px; position: relative; border-radius: 4px; overflow: hidden;">
                                <div class="absolute"
                                    :style="{ width: `${rowProgress(item) * 100}%`, height: '100%', backgroundColor: 'rgba(156, 39, 176, 0.5)' }" />
                            </div>
                            <div v-if="currentId === item.music_id" class="text-caption text-grey-6 q-mt-xs">
                                {{ formatDuration(currentTime) }} / {{ formatDuration(duration) }}
                            </div>
                        </div>

                        <!-- Genre (Desktop) -->
                        <div class="gt-xs text-grey-5" style="flex: 0 0 100px">
                            {{ item.genre || '—' }}
                        </div>

                        <!-- Price (Desktop) -->
                        <div class="gt-xs text-right" style="flex: 0 0 100px">
                            M{{ item.paid_amount }}
                        </div>

                        <!-- Download Button -->
                        <q-btn round flat dense icon="download" :loading="downloadingMusicId === item.music_id"
                            @click="downloadTrack(item)" />
                    </div>
                </template>
            </q-item>
        </q-list>

        <!-- EMPTY STATE -->
        <div v-else class="q-pa-xl flex flex-center column">
            <q-icon name="library_music" size="48px" color="grey-7" class="q-mb-md" />
            <div class="text-h6">No purchased tracks found</div>
            <div class="text-caption text-grey-5">Complete a music payment, then come back here.</div>
        </div>
    </q-page>
</template>
