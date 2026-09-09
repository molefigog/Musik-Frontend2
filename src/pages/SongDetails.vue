<template>
    <q-page class="track-details-page text-white overflow-hidden">
        <!-- LOADING -->
        <div v-if="loading" class="page-loading q-pa-xl flex flex-center column">
            <q-spinner color="purple-4" size="32px" class="q-mb-md" />
            <div class="text-subtitle1">Loading track…</div>
        </div>

        <!-- ERROR -->
        <div v-else-if="loadError" class="page-loading q-pa-xl flex flex-center column">
            <q-icon name="error_outline" size="32px" color="grey-5" class="q-mb-md" />
            <div class="text-subtitle1 q-mb-md">Couldn't load this track.</div>
            <q-btn flat dense label="Retry" color="purple-4" @click="fetchTrack" />
        </div>

        <!-- CONTENT -->
        <template v-else-if="track">
            <q-toolbar class="details-header q-px-md">
                <q-btn round flat dense icon="arrow_back" color="white" class="back-btn" @click="$router.back()" />
                <div class="brand-block">
                    <div class="brand-icon">
                        <q-icon name="headphones" size="18px" color="white" />
                    </div>
                    <div>
                        <div class="brand-name">GW ENT Store</div>
                        <div class="brand-sub">Beats Marketplace</div>
                    </div>
                </div>
            </q-toolbar>


            <div class=" q-pa-md">
                <div class="track-hero card-surface">
                    <div class="hero-art">
                        <img v-if="getCoverArt(track)" :src="getCoverArt(track)"
                            style="width: 100%; height: 100%; object-fit: cover;" class="cover-img" />
                        <div v-else class="cover-fallback">
                            <q-icon name="music_note" color="grey-6" />
                        </div>
                    </div>

                    <div class="hero-copy">
                        <div v-if="track.genre" class="genre-tag">{{ track.genre.title }}</div>
                        <h1>{{ track.title }}</h1>
                        <p v-if="track.release">{{ track.release.title }}</p>

                        <div class="meta-line text-grey-5">
                            <span v-if="track.duration">{{ track.duration }}</span>
                            <span v-if="track.duration && track.extension">·</span>
                            <span v-if="track.extension">{{ track.extension.toUpperCase() }}</span>
                            <span v-if="track.extension && track.size">·</span>
                            <span v-if="track.size">{{ track.size }}</span>
                        </div>

                        <div class="action-row">
                            <q-btn round :icon="isPlaying ? 'pause' : 'play_arrow'" class="primary-action"
                                @click="togglePlay(track.id, track.file_src)" />
                            <q-btn v-if="isApk" outline rounded color="white" icon="share" class="detail-btn"
                                :disable="true" hidden />
                            <q-btn v-else outline rounded color="white" label="Share" icon="share" class="detail-btn">
                                <q-menu anchor="bottom left" self="top left">
                                    <q-list class="share-menu">
                                        <q-item clickable v-close-popup @click="shareTo('x')">
                                            <q-item-section avatar><q-icon name="public" /></q-item-section>
                                            <q-item-section>X</q-item-section>
                                        </q-item>
                                        <q-item clickable v-close-popup @click="shareTo('facebook')">
                                            <q-item-section avatar><q-icon name="public" /></q-item-section>
                                            <q-item-section>Facebook</q-item-section>
                                        </q-item>
                                        <q-item clickable v-close-popup @click="shareTo('whatsapp')">
                                            <q-item-section avatar><q-icon name="chat" /></q-item-section>
                                            <q-item-section>WhatsApp</q-item-section>
                                        </q-item>
                                    </q-list>
                                </q-menu>
                            </q-btn>
                            <q-btn v-if="isFreeTrack(track)" outline rounded color="white" label="Download"
                                icon="download" class="detail-btn" :disable="isDownloading(track.id)"
                                :loading="isDownloading(track.id)" @click="downloadTrack(track)" />
                            <q-btn v-else unelevated rounded :label="'Buy — R' + priceLabel(track)" class="detail-btn"
                                @click="addTrackToCart(track)" />
                        </div>

                        <div v-if="hasDownloadState(track.id)" class="download-panel">
                            <q-linear-progress :value="downloadProgressValue(track.id)"
                                :indeterminate="isDownloadIndeterminate(track.id)" color="positive"
                                track-color="rgba(255, 255, 255, 0.12)" rounded size="4px" />
                            <div class="download-label">{{ downloadStatusLabel(track.id) }}</div>
                        </div>
                    </div>
                </div>

                <q-card flat class="track-waveform card-surface">
                    <div class="waveform-wrap cursor-pointer" @click="seekTrack(track.id, $event)">
                        <img v-if="track.waveform" :src="track.waveform" class="waveform-image" />
                        <div class="waveform-progress" :style="{ width: (progress * 100) + '%' }" />
                    </div>
                    <q-card-section class="row justify-between text-caption text-grey-5 waveform-times">
                        <span>{{ formatDuration(currentTime) }}</span>
                        <span>{{ track.duration }}</span>
                    </q-card-section>
                </q-card>

                <q-card flat class="track-info card-surface">
                    <q-card-section>
                        <div class="panel-header">Track Details</div>
                        <div class="info-grid">
                            <div class="info-item">
                                <div class="info-label">Genre</div>
                                <div class="info-value">{{ track.genre?.title || '—' }}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Release</div>
                                <div class="info-value">{{ track.release?.title || '—' }}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Duration</div>
                                <div class="info-value">{{ track.duration }}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">File Size</div>
                                <div class="info-value">{{ track.size }}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Format</div>
                                <div class="info-value">{{ track.extension?.toUpperCase() || '—' }}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Price</div>
                                <div class="info-value">{{ isFreeTrack(track) ? 'Free' : 'R' + priceLabel(track) }}
                                </div>
                            </div>
                        </div>
                    </q-card-section>
                </q-card>
            </div>

        </template>
    </q-page>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar, useMeta } from 'quasar'
import { ApiService } from 'src/services/api'
import { useCartStore } from 'src/stores/cart'
import { useNotificationsStore } from 'src/stores/notifications'
import { useAudioPlayer } from 'src/composables/useAudioPlayer'
import { useTrackDownload } from 'src/composables/useTrackDownload'
import { Capacitor } from '@capacitor/core'
import { buildTrackSlug, parseTrackSlug } from 'src/utils/track-slug'

const $q = useQuasar()
const api = ApiService
const route = useRoute()
const cart = useCartStore()
const notifications = useNotificationsStore()
const isApk = Capacitor.getPlatform() === 'android'
const track = ref(null)
const loading = ref(true)
const loadError = ref(false)
const getCoverArt = (track) => track?.release?.cover_art || track?.cover_art || ''

const pageTitle = computed(() => {
    if (!track.value?.title) return 'GW ENT Store | Beats Marketplace'
    return `${track.value.title} | GW ENT Store`
})

const pageDescription = computed(() => {
    if (!track.value) {
        return 'Discover premium beats and music releases from GW ENT Store.'
    }

    const release = track.value.release?.title ? ` from ${track.value.release.title}` : ''
    const genre = track.value.genre?.title ? ` • ${track.value.genre.title}` : ''
    return `${track.value.title}${release}${genre}. Stream or download this track from GW ENT Store.`
})

useMeta(() => ({
    title: pageTitle.value,
    meta: {
        description: { name: 'description', content: pageDescription.value },
        ogTitle: { property: 'og:title', content: pageTitle.value },
        ogDescription: { property: 'og:description', content: pageDescription.value },
        ogType: { property: 'og:type', content: 'website' },
        ogImage: {
            property: 'og:image',
            content: getCoverArt(track.value) || 'https://gw-ent.co.za/assets/og-default.jpg',
        },
        twitterCard: { name: 'twitter:card', content: 'summary_large_image' },
        twitterTitle: { name: 'twitter:title', content: pageTitle.value },
        twitterDescription: { name: 'twitter:description', content: pageDescription.value },
        twitterImage: {
            name: 'twitter:image',
            content: getCoverArt(track.value) || 'https://gw-ent.co.za/assets/og-default.jpg',
        },
    },
}))
// Audio player composable

const { isPlaying, progress, currentTime, togglePlay, seekTrack, stopAudio, cleanup } =
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
        const trackId = parseTrackSlug(route.params.slug)
        if (!trackId) throw new Error('Invalid track link')
        const { data } = await api.get(`/music/${trackId}`)
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

function getTrackShareUrl() {
    const appUrl = String(import.meta.env.VITE_PUBLIC_APP_URL || 'https://gw-ent.co.za').replace(/\/$/, '')
    return `${appUrl}/music/${buildTrackSlug(track.value)}`
}

function getShareData() {
    return {
        title: track.value.title,
        text: `Listen to ${track.value.title} on GW ENT Store`,
        url: getTrackShareUrl(),
    }
}


function shareTo(network) {
    if (!track.value) return

    const { text, url } = getShareData()
    const encodedUrl = encodeURIComponent(url)
    const encodedText = encodeURIComponent(`${text} ${url}`)
    const shareLinks = {
        x: `https://twitter.com/intent/tweet?text=${encodedText}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        whatsapp: `https://wa.me/?text=${encodedText}`,
    }
    const shareUrl = shareLinks[network]

    if (!shareUrl) return
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
}

// function formatSize(bytes) {
//     if (!bytes) return '—'
//     const mb = bytes / (1024 * 1024)
//     return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`
// }

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
    () => route.params.slug,
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

<style scoped>
.track-details-page {
    background:
        radial-gradient(circle at top left, rgba(168, 85, 247, 0.18), transparent 24%),
        radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.16), transparent 30%),
        #0a0a0f;
    min-height: 100vh;
    font-family: var(--q-font-sans, system-ui, sans-serif);
}

.details-header {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border-bottom: 0.5px solid rgba(255, 255, 255, 0.08);
    background: rgba(10, 10, 15, 0.9);
    backdrop-filter: blur(20px);
}

.back-btn {
    background: rgba(255, 255, 255, 0.04) !important;
    border: 0.5px solid rgba(255, 255, 255, 0.08) !important;
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
    background: linear-gradient(135deg, #4f46e5, #a855f7);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 18px rgba(168, 85, 247, 0.35);
}

.brand-name {
    font-size: 0.9rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: #f3f4f6;
}

.brand-sub {
    font-size: 0.65rem;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.details-scroll-area {
    background: transparent;
}

.details-shell {
    max-width: 820px;
    margin: 0 auto;
    padding-top: 1rem;
    padding-bottom: 4rem;
}

.card-surface {
    background: rgba(17, 24, 39, 0.72) !important;
    border: 1px solid rgba(255, 255, 255, 0.07) !important;
    border-radius: 1.25rem;
    box-shadow: 0 24px 50px rgba(15, 23, 42, 0.35);
    backdrop-filter: blur(12px);
}

.track-hero {
    display: grid;
    grid-template-columns: minmax(170px, 210px) minmax(0, 1fr);
    gap: 1.2rem;
    padding: 1.1rem;
    margin-bottom: 1rem;
}

.hero-art {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 220px;
    border-radius: 1.15rem;
    overflow: hidden;
    background: linear-gradient(145deg, rgba(124, 58, 237, 0.18), rgba(15, 23, 42, 0.5));
    border: 1px solid rgba(196, 181, 253, 0.2);
}

.art-ring {
    position: absolute;
    inset: 12%;
    border-radius: 50%;
    border: 1px solid rgba(196, 181, 253, 0.3);
    box-shadow: inset 0 0 40px rgba(168, 85, 247, 0.1), 0 0 40px rgba(168, 85, 247, 0.1);
}

.art-core {
    position: relative;
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, rgba(168, 85, 247, 0.48), rgba(17, 24, 39, 0.96) 68%);
    box-shadow: 0 18px 35px rgba(168, 85, 247, 0.2);
}

.hero-copy {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
}

.genre-tag {
    display: inline-flex;
    align-self: flex-start;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    color: #d1d5db;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 999px;
    padding: 0.35rem 0.7rem;
    margin-bottom: 0.55rem;
}

.hero-copy h1 {
    margin: 0;
    font-size: clamp(1.8rem, 2vw + 1rem, 2.9rem);
    line-height: 1.1;
    font-weight: 700;
    letter-spacing: -0.04em;
    color: #f8fafc;
}

.hero-copy p {
    margin: 0.45rem 0 0;
    color: rgba(229, 231, 235, 0.78);
    font-size: 1rem;
}

.meta-line {
    margin-top: 0.8rem;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.35rem;
    font-size: 0.76rem;
    letter-spacing: 0.01em;
}

.action-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1.2rem;
    flex-wrap: wrap;
}

.primary-action {
    box-shadow: 0 18px 35px rgba(168, 85, 247, 0.42) !important;
}

.detail-btn {
    min-height: 2.7rem !important;
    font-weight: 600 !important;
    letter-spacing: 0.01em;
}

.download-panel {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}

.download-label {
    font-size: 0.68rem;
    color: #9ca3af;
}

.track-waveform {
    overflow: hidden;
    margin-bottom: 1rem;
}

.waveform-wrap {
    position: relative;
    height: 110px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.waveform-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: grayscale(1) brightness(0.72);
}

.waveform-progress {
    position: absolute;
    inset: 0 auto 0 0;
    width: 0;
    max-width: 100%;
    background: linear-gradient(90deg, rgba(168, 85, 247, 0.7), rgba(192, 132, 252, 0.38));
    box-shadow: inset -12px 0 20px rgba(255, 255, 255, 0.08);
}

.waveform-times {
    padding: 0.9rem 1rem 1rem !important;
    font-size: 0.72rem;
}

.track-info {
    overflow: hidden;
}

.panel-header {
    font-size: 1.02rem;
    font-weight: 700;
    color: #f3f4f6;
    margin-bottom: 1rem;
}

.info-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.9rem;
}

.info-item {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 0.8rem;
    padding: 0.9rem 0.8rem;
}

.info-label {
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #9ca3af;
    margin-bottom: 0.45rem;
}

.info-value {
    font-size: 0.92rem;
    font-weight: 600;
    color: #f8fafc;
    word-break: break-word;
}

@media (max-width: 640px) {
    .details-shell {
        padding-left: 0.7rem;
        padding-right: 0.7rem;
    }

    .track-hero {
        grid-template-columns: 1fr;
        padding: 0.9rem;
    }

    .hero-art {
        min-height: 170px;
    }

    .art-core {
        width: 96px;
        height: 96px;
    }

    .info-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}
</style>
