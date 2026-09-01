<template>
    <q-page class="text-white overflow-hidden">
        <MusicFilters v-model:filters="filters" :genres="genres" :releases="releases" />

        <!-- STORE HEADER -->
        <q-toolbar class="q-px-md q-py-sm">
            <div class="row items-center q-gutter-sm">
                <q-icon name="headphones" size="20px" />
                <div>
                    <div class="text-subtitle1 text-weight-bold">GW ENT Store</div>
                    <div class="text-caption text-grey-4">Beats Marketplace</div>
                </div>
            </div>
            <q-space />
            <q-btn flat dense icon="shopping_cart" @click="$router.push('/cart')">
                <q-badge v-if="cart.itemCount > 0" color="purple-4" floating>
                    {{ cart.itemCount }}
                </q-badge>
            </q-btn>
        </q-toolbar>

        <!-- TRACK LIST HEADER (Desktop only) -->
        <q-toolbar class="gt-xs q-px-md text-grey-6 text-caption">
            <span style="flex: 0 0 40px"></span>
            <span style="flex: 1">Title</span>
            <span style="flex: 1">Waveform</span>
            <span style="flex: 0 0 100px">Genre</span>
            <span style="flex: 0 0 80px">Price</span>
            <span style="flex: 0 0 80px"></span>
        </q-toolbar>

        <!-- TRACKS -->
        <q-list v-if="filteredMusic.length" separator class="q-pa-md">
            <q-item v-for="track in filteredMusic" :key="track.id">
                <template #default>
                    <div class="row full-width items-center q-gutter-md">
                        <!-- Play Button -->
                        <q-btn flat dense round :icon="currentId === track.id && isPlaying ? 'pause' : 'play_arrow'"
                            size="sm" @click="togglePlay(track.id, track.file_src)" />

                        <!-- Waveform + Info -->
                        <div class="col row items-center q-gutter-md cursor-pointer" style="min-width: 0; flex: 1">
                            <div style="flex: 1; min-width: 0" @click="seekWaveform(track, $event)">
                                <img v-if="track.waveform" :src="track.waveform" class="full-width"
                                    style="height: 40px; object-fit: cover;" />
                            </div>
                            <div style="flex: 1; min-width: 0" class="lt-sm">
                                <div class="text-subtitle2 text-weight-medium">{{ track.title }}</div>
                                <div v-if="track.release" class="text-caption text-grey-5">{{ track.release.title }}
                                </div>
                            </div>
                        </div>

                        <!-- Title (Desktop only) -->
                        <div class="gt-xs" style="flex: 1; min-width: 0">
                            <div class="text-subtitle2">{{ track.title }}</div>
                            <div v-if="track.release" class="text-caption text-grey-5">{{ track.release.title }}</div>
                        </div>

                        <!-- Genre (Desktop only) -->
                        <div class="gt-xs text-grey-5" style="flex: 0 0 100px">
                            {{ track.genre?.title || '—' }}
                        </div>

                        <!-- Price (Desktop only) -->
                        <div class="gt-xs text-right" style="flex: 0 0 80px">
                            {{ isFreeTrack(track) ? 'Free' : `R${priceLabel(track)}` }}
                        </div>

                        <!-- Actions (Desktop) -->
                        <q-btn flat dense round icon="more_vert" class="gt-xs" @click="openTrackActions(track)" />
                        <q-btn v-if="isFreeTrack(track)" flat dense round icon="download" class="gt-xs"
                            :disable="isDownloading(track.id)" :loading="isDownloading(track.id)"
                            @click="downloadTrack(track)" />
                        <q-btn v-else flat dense round icon="add_shopping_cart" class="gt-xs"
                            @click="addTrackToCart(track)" />

                        <!-- Actions (Mobile) -->
                        <q-btn flat dense round icon="more_vert" class="lt-sm" @click="openTrackActions(track)" />
                    </div>

                    <!-- Download Progress -->
                    <div v-if="hasDownloadState(track.id)" class="q-mt-sm full-width">
                        <q-linear-progress :value="downloadProgressValue(track.id)"
                            :indeterminate="isDownloadIndeterminate(track.id)" color="positive"
                            track-color="rgba(255, 255, 255, 0.12)" rounded size="3px" />
                        <div class="text-caption q-mt-xs">{{ downloadStatusLabel(track.id) }}</div>
                    </div>
                </template>
            </q-item>
        </q-list>

        <!-- Empty State -->
        <div v-else class="q-pa-xl flex flex-center column">
            <q-icon name="music_note" size="48px" color="grey-7" class="q-mb-md" />
            <div class="text-subtitle1 text-grey-6">No tracks found</div>
        </div>

        <!-- Mobile Actions Sheet -->
        <q-dialog v-model="mobileActionsOpen" position="bottom" transition-show="slide-up" transition-hide="slide-down">
            <q-card class="q-pa-md" style="max-width: 100%; border-radius: 16px 16px 0 0;">
                <div class="text-h6 text-weight-bold q-mb-sm">{{ selectedTrack?.title }}</div>

                <q-chip v-if="selectedTrack?.genre" dense class="q-mr-sm">
                    {{ selectedTrack.genre.title }}
                </q-chip>
                <q-chip v-if="selectedTrack?.release" dense>
                    {{ selectedTrack.release.title }}
                </q-chip>

                <q-separator class="q-my-md" />

                <div class="column q-gutter-sm">
                    <q-btn flat :icon="currentId === selectedTrack?.id && isPlaying ? 'pause' : 'play_arrow'"
                        label="Play" color="primary" @click="handleSheetPlay" />
                    <q-btn v-if="isFreeTrack(selectedTrack)" flat icon="download" label="Download"
                        :loading="isDownloading(selectedTrack?.id)" @click="handleSheetDownload" />
                    <q-btn v-else flat icon="add_shopping_cart" :label="`Add to Cart — R${priceLabel(selectedTrack)}`"
                        @click="handleSheetAddToCart" />
                    <q-btn flat icon="info" label="View Details" @click="viewDetails" />
                </div>

                <div v-if="hasDownloadState(selectedTrack?.id)" class="q-mt-md">
                    <q-linear-progress :value="downloadProgressValue(selectedTrack?.id)"
                        :indeterminate="isDownloadIndeterminate(selectedTrack?.id)" color="positive"
                        track-color="rgba(255, 255, 255, 0.12)" rounded size="3px" />
                    <div class="text-caption q-mt-xs">{{ downloadStatusLabel(selectedTrack?.id) }}</div>
                </div>
            </q-card>
        </q-dialog>
    </q-page>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { ApiService } from 'src/services/api'
import { useCartStore } from 'src/stores/cart'
import { useNotificationsStore } from 'src/stores/notifications'
import { useAudioPlayer } from 'src/composables/useAudioPlayer'
import { useTrackDownload } from 'src/composables/useTrackDownload'
import { useMusicFilters } from 'src/composables/useMusicFilters'
import MusicFilters from 'src/components/MusicFilters.vue'

const router = useRouter()
const $q = useQuasar()
const api = ApiService
const cart = useCartStore()
const notifications = useNotificationsStore()

// State
const music = ref([])
const mobileActionsOpen = ref(false)
const selectedTrack = ref(null)

// Composables
const { currentId, isPlaying, progress, togglePlay, seekTrack, cleanup } = useAudioPlayer()
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

// Filters
const filters = ref({
    search: '',
    genre: null,
    release: null,
    price: null,
    letter: null
})

const { filteredMusic } = useMusicFilters(music, filters)

// Computed
const genres = computed(() => {
    const map = new Map()
    music.value.forEach(track => {
        if (track.genre && !map.has(track.genre.id)) {
            map.set(track.genre.id, track.genre)
        }
    })
    return [...map.values()]
})

const releases = computed(() => {
    const map = new Map()
    music.value.forEach(track => {
        if (track.release && !map.has(track.release.id)) {
            map.set(track.release.id, track.release)
        }
    })
    return [...map.values()]
})

// Helpers
function isFreeTrack(track) {
    return !track?.price || Number(track.price) === 0
}

function priceLabel(t) {
    return !isNaN(Number(t?.price)) ? Number(t.price).toFixed(2) : '—'
}

function seekWaveform(track, event) {
    if (currentId.value === track.id) {
        seekTrack(track.id, event)
    }
}

// Download
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
                    ? `${track.title} saved to Downloads`
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
                ? `${track.title} saved to Downloads`
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

// Cart
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

// Mobile actions sheet
function openTrackActions(track) {
    selectedTrack.value = track
    mobileActionsOpen.value = true
}

function closeTrackActions() {
    mobileActionsOpen.value = false
    selectedTrack.value = null
}

function handleSheetPlay() {
    if (!selectedTrack.value) return
    togglePlay(selectedTrack.value.id, selectedTrack.value.file_src)
}

function handleSheetDownload() {
    if (!selectedTrack.value) return
    downloadTrack(selectedTrack.value)
}

function handleSheetAddToCart() {
    addTrackToCart(selectedTrack.value)
    closeTrackActions()
}

function viewDetails() {
    if (!selectedTrack.value) return
    router.push(`/music/${selectedTrack.value.id}`)
    closeTrackActions()
}

// API
async function fetchMusic() {
    try {
        const res = await api.get('/music')
        music.value = res.data.data
    } catch (err) {
        console.error(err)
        $q.notify({
            type: 'negative',
            message: 'Failed to load music'
        })
    }
}

// Lifecycle
onMounted(async () => {
    await fetchMusic()
})

onBeforeUnmount(() => {
    cleanup()
})
</script>