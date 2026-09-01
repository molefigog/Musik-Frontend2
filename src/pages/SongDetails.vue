<template>
    <q-page class="text-white overflow-hidden">
        <!-- LOADING -->
        <div v-if="loading" class="q-pa-xl flex flex-center column">
            <q-spinner color="purple-4" size="32px" class="q-mb-md" />
            <div class="text-subtitle1">Loading track…</div>
        </div>

        <!-- ERROR -->
        <div v-else-if="loadError" class="q-pa-xl flex flex-center column">
            <q-icon name="error_outline" size="32px" color="grey-5" class="q-mb-md" />
            <div class="text-subtitle1 q-mb-md">Couldn't load this track.</div>
            <q-btn flat dense label="Retry" color="purple-4" @click="fetchTrack" />
        </div>

        <!-- CONTENT -->
        <template v-else-if="track">
            <!-- HEADER -->
            <q-toolbar class="q-px-md">
                <q-btn round flat dense icon="arrow_back" @click="$router.back()" />
                <div class="row items-center q-gutter-sm q-ml-md">
                    <q-icon name="headphones" size="18px" />
                    <div>
                        <div class="text-subtitle2 text-weight-bold">GW ENT Store</div>
                        <div class="text-caption text-grey-4">Beats Marketplace</div>
                    </div>
                </div>
            </q-toolbar>

            <!-- MAIN CONTENT -->
            <q-scroll-area class="flex-1">
                <div class="q-pa-md">
                    <!-- ALBUM ART & INFO -->
                    <div class="column q-gutter-md q-mb-lg">
                        <div class="flex flex-center">
                            <q-icon name="music_note" size="64px" color="purple-3" />
                        </div>

                        <div class="column q-gutter-sm">
                            <q-chip v-if="track.genre" dense>{{ track.genre.title }}</q-chip>
                            <h1 class="text-h5 text-weight-bold q-my-none">{{ track.title }}</h1>
                            <p v-if="track.release" class="text-subtitle2 text-grey-4 q-my-none">{{ track.release.title
                            }}</p>

                            <div class="text-caption text-grey-5">
                                <span v-if="track.duration">{{ formatDuration(track.duration) }}</span>
                                <span v-if="track.duration && track.extension">·</span>
                                <span v-if="track.extension">{{ track.extension.toUpperCase() }}</span>
                                <span v-if="track.extension && track.size">·</span>
                                <span v-if="track.size">{{ formatSize(track.size) }}</span>
                            </div>

                            <div class="row q-gutter-sm q-mt-md">
                                <q-btn round color="primary" :icon="isPlaying ? 'pause' : 'play_arrow'"
                                    @click="togglePlay(track.id, track.file_src)" />
                                <q-btn v-if="isFreeTrack(track)" outline rounded color="white" label="Download"
                                    icon="download" :disable="isDownloading(track.id)"
                                    :loading="isDownloading(track.id)" @click="downloadTrack(track)" />
                                <q-btn v-else unelevated rounded color="purple-6" :label="'Buy — R' + priceLabel(track)"
                                    icon="add_shopping_cart" @click="addTrackToCart(track)" />
                            </div>

                            <!-- DOWNLOAD PROGRESS -->
                            <div v-if="hasDownloadState(track.id)" class="q-mt-md">
                                <q-linear-progress :value="downloadProgressValue(track.id)"
                                    :indeterminate="isDownloadIndeterminate(track.id)" color="positive"
                                    track-color="rgba(255, 255, 255, 0.12)" rounded size="4px" />
                                <div class="text-caption q-mt-xs">{{ downloadStatusLabel(track.id) }}</div>
                            </div>
                        </div>
                    </div>

                    <!-- WAVEFORM PLAYER -->
                    <q-card flat class="q-mb-lg">
                        <div class="bg-grey-9 cursor-pointer" @click="seekTrack(track.id, $event)"
                            style="height: 100px;">
                            <img v-if="track.waveform" :src="track.waveform" class="full-width full-height"
                                style="object-fit: cover;" />
                            <div class="absolute"
                                :style="{ width: (progress * 100) + '%', height: '100%', backgroundColor: 'rgba(156, 39, 176, 0.5)' }" />
                        </div>
                        <q-card-section class="row justify-between text-caption text-grey-5">
                            <span>{{ formatDuration(currentTime) }}</span>
                            <span>{{ formatDuration(track.duration) }}</span>
                        </q-card-section>
                    </q-card>

                    <!-- TRACK DETAILS GRID -->
                    <q-card flat>
                        <q-card-section>
                            <div class="text-subtitle2 text-weight-bold q-mb-md">Track Details</div>
                            <div class="row q-col-gutter-md">
                                <div class="col-6 col-sm-4">
                                    <div class="text-caption text-grey-5">Genre</div>
                                    <div class="text-body2">{{ track.genre?.title || '—' }}</div>
                                </div>
                                <div class="col-6 col-sm-4">
                                    <div class="text-caption text-grey-5">Release</div>
                                    <div class="text-body2">{{ track.release?.title || '—' }}</div>
                                </div>
                                <div class="col-6 col-sm-4">
                                    <div class="text-caption text-grey-5">Duration</div>
                                    <div class="text-body2">{{ formatDuration(track.duration) }}</div>
                                </div>
                                <div class="col-6 col-sm-4">
                                    <div class="text-caption text-grey-5">File Size</div>
                                    <div class="text-body2">{{ formatSize(track.size) }}</div>
                                </div>
                                <div class="col-6 col-sm-4">
                                    <div class="text-caption text-grey-5">Format</div>
                                    <div class="text-body2">{{ track.extension?.toUpperCase() || '—' }}</div>
                                </div>
                                <div class="col-6 col-sm-4">
                                    <div class="text-caption text-grey-5">Price</div>
                                    <div class="text-body2">{{ isFreeTrack(track) ? 'Free' : 'R' + priceLabel(track) }}
                                    </div>
                                </div>
                            </div>
                        </q-card-section>
                    </q-card>
                </div>
            </q-scroll-area>
        </template>
    </q-page>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { ApiService } from 'src/services/api'
import { useCartStore } from 'src/stores/cart'
import { useNotificationsStore } from 'src/stores/notifications'
import { useAudioPlayer } from 'src/composables/useAudioPlayer'
import { useTrackDownload } from 'src/composables/useTrackDownload'

const $q = useQuasar()
const api = ApiService
const route = useRoute()
const cart = useCartStore()
const notifications = useNotificationsStore()

const track = ref(null)
const loading = ref(true)
const loadError = ref(false)

// Audio player composable
// eslint-disable-next-line no-unused-vars
const { currentId, isPlaying, progress, currentTime, togglePlay, seekTrack, stopAudio, cleanup } =
    useAudioPlayer()

// Download composable
const {
    hasDownloadState,
    isDownloading,
    isDownloadIndeterminate,
    downloadProgressValue,
    downloadStatusLabel,
    setDownloadState,
    getTrackDownloadUrl,
    getTrackDownloadName,
    isNativeAndroid,
    saveBlobToDevice
} = useTrackDownload()

async function fetchTrack() {
    loading.value = true
    loadError.value = false
    try {
        const { data } = await api.get(`/music/${route.params.id}`)
        track.value = data.data
    } catch (err) {
        console.error(err)
        loadError.value = true
    } finally {
        loading.value = false
    }
}

function isFreeTrack(t) {
    return !t?.price || Number(t.price) === 0
}

function priceLabel(t) {
    return !isNaN(Number(t?.price)) ? Number(t.price).toFixed(2) : '—'
}

function formatDuration(seconds) {
    if (!seconds && seconds !== 0) return '—'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
}

function formatSize(bytes) {
    if (!bytes) return '—'
    const mb = bytes / (1024 * 1024)
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`
}

async function downloadTrack(track) {
    if (!track?.id || !isFreeTrack(track)) return
    if (isDownloading(track.id)) return

    const url = getTrackDownloadUrl(track)
    if (!url) {
        $q.notify({ type: 'negative', message: 'No file available for download' })
        return
    }

    try {
        setDownloadState(track.id, {
            status: 'downloading',
            progress: 0,
            totalBytes: 0,
            loadedBytes: 0
        })

        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`Download failed with status ${response.status}`)
        }

        const totalBytes = Number(response.headers.get('content-length') || 0)

        if (!response.body) {
            const blob = await response.blob()
            const savedAs = await saveBlobToDevice(blob, getTrackDownloadName(track))
            setDownloadState(track.id, {
                status: 'done',
                progress: 100,
                totalBytes,
                loadedBytes: totalBytes || blob.size
            })
            $q.notify({
                type: 'positive',
                message: isNativeAndroid()
                    ? `${track.title} saved to ${savedAs}`
                    : `${track.title} download complete`
            })
            notifications.addHistoryEvent({
                eventType: 'download.completed',
                entityId: `${track.id}-${Date.now()}`,
                title: 'Audio download completed',
                body: track.title || 'Track download finished',
                raw: { musicId: track.id, filePath: savedAs }
            })
            return
        }

        const reader = response.body.getReader()
        const chunks = []
        let loadedBytes = 0

        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            chunks.push(value)
            loadedBytes += value.length
            const progressPercent = totalBytes > 0 ? (loadedBytes / totalBytes) * 100 : 0
            setDownloadState(track.id, {
                status: 'downloading',
                progress: progressPercent,
                totalBytes,
                loadedBytes
            })
        }

        const blob = new Blob(chunks)
        const savedAs = await saveBlobToDevice(blob, getTrackDownloadName(track))

        setDownloadState(track.id, {
            status: 'done',
            progress: 100,
            totalBytes,
            loadedBytes
        })
        $q.notify({
            type: 'positive',
            message: isNativeAndroid()
                ? `${track.title} saved to ${savedAs}`
                : `${track.title} download complete`
        })
        notifications.addHistoryEvent({
            eventType: 'download.completed',
            entityId: `${track.id}-${Date.now()}`,
            title: 'Audio download completed',
            body: track.title || 'Track download finished',
            raw: { musicId: track.id, filePath: savedAs }
        })
    } catch (error) {
        console.error(error)
        setDownloadState(track.id, { status: 'error' })
        $q.notify({ type: 'negative', message: `Failed to download ${track.title}` })
    }
}

function addTrackToCart(track) {
    if (!track) return
    const added = cart.addItem(
        { id: track.id, name: track.title, price: Number(track.price) || 0, type: 'music' },
        'music'
    )
    if (added) {
        $q.notify({ type: 'positive', message: `${track.title} added to cart` })
    } else {
        $q.notify({ type: 'warning', message: 'Your cart already contains a different item type' })
    }
}

watch(
    () => route.params.id,
    () => {
        stopAudio()
        fetchTrack()
    }
)

onMounted(async () => {
    await fetchTrack()
})

onBeforeUnmount(() => {
    cleanup()
})
</script>
