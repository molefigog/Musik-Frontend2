<script setup>
import { ref, computed, onUnmounted, watch } from 'vue'
import { Capacitor } from '@capacitor/core'
import {
    clearAudioNotification,
    setAudioNotificationActionHandler,
    showAudioNotification,
} from 'src/services/notifications'
import {
    sharedCurrentId,
    sharedIsPlaying,
    sharedPlayAudio,
    sharedSeekTo,
    sharedStopAudio,
    sharedTracks,
    sharedProgress,
    sharedCurrentTime,
    sharedDuration,
    sharedIsLoading,
    registerTracks,
} from 'src/services/audio-player-state'
import { createAudioEngine } from 'src/services/audio-engine'

const props = defineProps({
    tracks: {
        type: Array,
        default: () => []
    }
})

const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

const currentId = sharedCurrentId
const isPlaying = sharedIsPlaying
const progress = sharedProgress
const duration = sharedDuration
const currentTime = sharedCurrentTime
const isLoading = sharedIsLoading

const isScrubbing = ref(false)
const scrubTrackEl = ref(null)

// Android mini-player visibility. Hidden while nothing is loaded,
// auto-opens when a track starts, and can be toggled independently
// of playback (closing it does not stop audio).
const dialog = ref(false)

const emit = defineEmits([
    'update:playing',
    'update:currentId',
    'seek',
    'progress'
])

const getSrc = (track) => {
    if (!track?.file_src) return ''
    // Already-resolved sources (public URLs, or blob:/data: URLs built by a
    // caller that needed to fetch an authenticated file first) pass through
    // untouched. Everything else is treated as a storage-relative path.
    if (/^(https?:|blob:|data:)/.test(track.file_src)) return track.file_src
    return `${import.meta.env.VITE_API_BASE_URL}/storage/${track.file_src}`
}

const currentTrack = computed(() =>
    sharedTracks.value.find(t => t.id === currentId.value)
)

const currentIndex = computed(() =>
    sharedTracks.value.findIndex(t => t.id === currentId.value)
)

const hasNext = computed(() =>
    currentIndex.value >= 0 && currentIndex.value < props.tracks.length - 1
)

const hasPrev = computed(() =>
    currentIndex.value > 0
)

const formatTime = (sec) => {
    if (!sec || isNaN(sec)) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
}

// One playback engine for the lifetime of the app module: HTML5 <audio> on
// web, the native ExoAudioPlayer Capacitor plugin on Android. Both report
// back through this same set of callbacks, which just write into the
// shared refs — nothing downstream needs to know which engine is active.
const engine = createAudioEngine({
    onTimeUpdate: ({ currentTime: ct, duration: d, progress: p }) => {
        currentTime.value = ct
        duration.value = d
        progress.value = p
        emit('progress', p)
    },
    onLoadedMetadata: (d) => {
        duration.value = d
    },
    onEnded: () => {
        if (hasNext.value) {
            playNext()
        } else {
            isPlaying.value = false
            progress.value = 0
            currentTime.value = 0
            currentId.value = null
            clearAudioNotification()
        }
    },
    onPlayState: (playing) => {
        isPlaying.value = playing
    },
})

const playAudio = async (track) => {
    const src = getSrc(track)
    if (!src) return

    if (currentId.value === track.id) {
        togglePlay()
        return
    }

    isLoading.value = true
    currentTime.value = 0
    duration.value = 0
    progress.value = 0

    try {
        await engine.load(src)
        currentId.value = track.id
        await engine.play()
        isPlaying.value = true
        showAudioNotification({ title: track.title, isPlaying: true })
        emit('update:playing', true)
        emit('update:currentId', track.id)
    } catch (e) {
        console.error(e)
    } finally {
        isLoading.value = false
    }
}

const togglePlay = async () => {
    if (isPlaying.value) {
        await engine.pause()
        isPlaying.value = false
    } else {
        await engine.play()
        isPlaying.value = true
    }

    if (currentTrack.value) {
        showAudioNotification({ title: currentTrack.value.title, isPlaying: isPlaying.value })
    }

    emit('update:playing', isPlaying.value)
}

const stopAudio = () => {
    engine.stop()
    isPlaying.value = false
    progress.value = 0
    currentTime.value = 0
    duration.value = 0
    currentId.value = null
    clearAudioNotification()
}

sharedPlayAudio.value = playAudio
sharedStopAudio.value = stopAudio

setAudioNotificationActionHandler((actionId) => {
    if (actionId === 'toggle') togglePlay()
    if (actionId === 'stop') stopAudio()
})

const playNext = () => {
    if (!hasNext.value) return
    playAudio(props.tracks[currentIndex.value + 1])
}

const playPrev = () => {
    if (!hasPrev.value) return
    playAudio(props.tracks[currentIndex.value - 1])
}

const seek = (e) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    if (!duration.value) return
    engine.seekTo(percent)
    emit('seek', percent)
}

const seekByClientX = (clientX) => {
    const el = scrubTrackEl.value
    if (!el || !duration.value) return
    const rect = el.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    engine.seekTo(percent)
    emit('seek', percent)
}

const onScrubMove = (e) => {
    if (!isScrubbing.value) return
    seekByClientX(e.clientX)
}

const stopScrub = () => {
    if (!isScrubbing.value) return
    isScrubbing.value = false
    window.removeEventListener('pointermove', onScrubMove)
    window.removeEventListener('pointerup', stopScrub)
    window.removeEventListener('pointercancel', stopScrub)
}

const startScrub = (e) => {
    if (!duration.value) return
    isScrubbing.value = true
    seekByClientX(e.clientX)
    window.addEventListener('pointermove', onScrubMove)
    window.addEventListener('pointerup', stopScrub)
    window.addEventListener('pointercancel', stopScrub)
}

const seekTo = (percent) => {
    if (!duration.value) return
    engine.seekTo(percent)
}

sharedSeekTo.value = seekTo

// Android only: open the mini-player automatically when a new track
// starts, and hide it again once playback is fully stopped/cleared.
// A manual dialog.value = false (via the close button or the fab)
// is left untouched by this watcher unless the track itself changes.
if (isAndroid) {
    watch(currentTrack, (track, prevTrack) => {
        if (track && !prevTrack) {
            dialog.value = true
        } else if (!track) {
            dialog.value = false
        }
    })
}

const toggleDialog = () => {
    dialog.value = !dialog.value
}

defineExpose({
    playAudio,
    seekTo,
    stopAudio,
})

watch(() => props.tracks, registerTracks, { immediate: true })

/* keep playback running across route changes */
onUnmounted(() => {
    stopScrub()
    // Intentionally do not pause or clear src.
})
</script>

<template>
    <!-- WEB: full bottom player bar -->
    <div v-if="currentTrack && !isAndroid" class="player-bar fixed-bottom">

        <!-- SEEK BAR -->
        <div ref="scrubTrackEl" class="seek-track" @click="seek" @pointerdown.prevent="startScrub">
            <div class="seek-fill" :style="{ width: (progress * 100) + '%' }" />
            <div class="seek-thumb" :style="{ left: 'calc(' + (progress * 100) + '% - 5px)' }" />
        </div>

        <!-- PLAYER INNER -->
        <div class="player-inner">

            <!-- LEFT: Track Info -->
            <div class="track-info">
                <div class="track-title ellipsis">
                    {{ currentTrack.title || 'Untitled Beat' }}
                </div>
                <div class="track-status">
                    <span class="status-dot" :class="{ paused: !isPlaying }" />
                    <span class="status-label">{{ isPlaying ? 'Now Playing' : 'Paused' }}</span>
                </div>
            </div>

            <!-- CENTER: Controls -->
            <div class="controls">
                <button class="ctrl-btn" :disabled="!hasPrev" aria-label="Previous" @click="playPrev">
                    <q-icon name="skip_previous" size="20px" />
                </button>

                <button class="ctrl-btn play-main" aria-label="Play/Pause" @click="togglePlay">
                    <q-icon :name="isPlaying ? 'pause' : 'play_arrow'" size="22px" />
                </button>

                <button class="ctrl-btn stop-btn" aria-label="Stop" @click="stopAudio">
                    <q-icon name="stop" size="20px" />
                </button>

                <button class="ctrl-btn" :disabled="!hasNext" aria-label="Next" @click="playNext">
                    <q-icon name="skip_next" size="20px" />
                </button>
            </div>

            <!-- RIGHT: Time + Volume -->
            <div class="right-controls">
                <div class="time-wrap">
                    <span class="time-val current">{{ formatTime(currentTime) }}</span>
                    <span class="time-sep">/</span>
                    <span class="time-val">{{ formatTime(duration) }}</span>
                </div>
                <div class="vol-wrap">
                    <q-icon name="volume_up" size="15px" class="vol-icon" />
                    <input type="range" class="vol-slider" min="0" max="100" value="75" aria-label="Volume" />
                </div>
            </div>

        </div>
    </div>

    <!-- ANDROID: toggleable mini-player -->
    <template v-if="isAndroid">
        <q-dialog v-model="dialog" position="bottom" seamless>
            <q-card v-if="currentTrack" style="width: 350px" class="mini-player-card">
                <q-linear-progress :value="progress" color="pink" />

                <q-card-section class="row items-center no-wrap">
                    <div class="mini-info">
                        <div class="text-weight-bold ellipsis">{{ currentTrack.title || 'Untitled Beat' }}</div>
                        <div class="text-grey ellipsis">{{ isPlaying ? 'Now Playing' : 'Paused' }}</div>
                    </div>

                    <q-space />

                    <q-btn flat round dense icon="fast_rewind" :disable="!hasPrev" @click="playPrev" />
                    <q-btn flat round dense :icon="isPlaying ? 'pause' : 'play_arrow'" @click="togglePlay" />
                    <q-btn flat round dense icon="fast_forward" :disable="!hasNext" @click="playNext" />
                    <q-btn flat round dense icon="close" class="q-ml-xs" @click="dialog = false" />
                </q-card-section>
            </q-card>
        </q-dialog>

        <!-- Reopen button: shown only while a track is loaded but the mini-player is collapsed -->
        <q-btn v-if="currentTrack && !dialog" round color="primary" :icon="isPlaying ? 'pause' : 'play_arrow'"
            class="mini-player-fab" @click="toggleDialog" />
    </template>
</template>

<style scoped>
.player-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    background: rgba(10, 10, 15, 0.98);
    border-top: 0.5px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
}

.seek-track {
    width: 100%;
    height: 0.2rem;
    background: rgba(255, 255, 255, 0.08);
    cursor: pointer;
    position: relative;
}

.seek-track:hover .seek-fill {
    background: #a78bfa;
}

.seek-track:hover .seek-thumb {
    opacity: 1;
}

.seek-fill {
    height: 100%;
    background: #7c3aed;
    transition: width 0.05s linear;
    pointer-events: none;
}

.seek-thumb {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    background: #a78bfa;
    opacity: 0;
    pointer-events: none;
    transition: left 0.05s linear, opacity 0.15s;
}

.player-inner {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    padding: 0.55rem 0.75rem 0.65rem;
    gap: 0.55rem;
}

.track-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.track-title {
    font-size: 0.78rem;
    font-weight: 600;
    color: #e5e7eb;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.track-status {
    display: flex;
    align-items: center;
    gap: 0.28rem;
    margin-top: 0.14rem;
}

.status-dot {
    width: 0.3rem;
    height: 0.3rem;
    border-radius: 50%;
    background: #7c3aed;
    transition: background 0.2s;
    flex-shrink: 0;
}

.status-dot.paused {
    background: #4b5563;
}

.status-label {
    font-size: 0.68rem;
    color: #6b7280;
}

.controls {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    justify-content: center;
}

.ctrl-btn {
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 50%;
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    transition: color 0.15s;
    padding: 0;
}

.ctrl-btn:hover:not(:disabled) {
    color: #e5e7eb;
}

.ctrl-btn:disabled {
    opacity: 0.3;
    cursor: default;
}

.ctrl-btn.play-main {
    width: 2.5rem;
    height: 2.5rem;
    background: #fa233b1f;
    color: #fff;
}

.ctrl-btn.play-main:hover {
    background: #fa233c67;
    transform: scale(1.03);
}

.right-controls {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    justify-content: flex-end;
}

.time-wrap {
    display: flex;
    align-items: center;
    gap: 0.35rem;
}

.time-val {
    font-size: 0.7rem;
    color: #6b7280;
    font-variant-numeric: tabular-nums;
    min-width: 2rem;
}

.time-val.current {
    color: #a78bfa;
    text-align: right;
}

.time-sep {
    font-size: 0.7rem;
    color: #374151;
}

.vol-wrap {
    display: flex;
    align-items: center;
    gap: 0.35rem;
}

.vol-icon {
    color: #4b5563;
}

.vol-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 4.5rem;
    height: 0.2rem;
    border-radius: 0.125rem;
    background: rgba(255, 255, 255, 0.12);
    cursor: pointer;
    outline: none;
}

.vol-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    background: #7c3aed;
    cursor: pointer;
}

.vol-slider::-moz-range-thumb {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    background: #7c3aed;
    border: none;
    cursor: pointer;
}

@media (max-width: 900px) {
    .player-inner {
        grid-template-columns: minmax(0, 1fr) auto;
        height: 56px;
        padding: 0 0.85rem;
        gap: 0.65rem;
    }

    .track-info {
        align-items: flex-start;
        text-align: left;
    }

    .track-status {
        gap: 0.25rem;
    }

    .controls {
        gap: 0.65rem;
    }

    .ctrl-btn {
        width: 2.5rem;
        height: 2.5rem;
    }

    .ctrl-btn.play-main {
        width: 2.9rem;
        height: 2.9rem;
    }

    .right-controls {
        display: none;
    }
}

@media (max-width: 600px) {
    .player-inner {
        padding: 0 0.6rem;
        gap: 0.45rem;
    }

    .track-title {
        font-size: 0.74rem;
        max-width: 92vw;
    }

    .status-label {
        font-size: 0.64rem;
    }

    .controls {
        gap: 0.5rem;
    }

    .ctrl-btn {
        width: 2.35rem;
        height: 2.35rem;
    }

    .ctrl-btn.play-main {
        width: 2.7rem;
        height: 2.7rem;
    }

    .seek-track {
        height: 0.25rem;
    }

    .seek-thumb {
        width: 0.8rem;
        height: 0.8rem;
        opacity: 1;
    }
}

/* ANDROID mini-player */
.mini-player-card {
    border-radius: 12px;
}

.mini-info {
    min-width: 0;
    flex: 1;
}

.mini-info .ellipsis {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.mini-player-fab {
    position: fixed;
    right: 16px;
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    z-index: 9999;
}
</style>