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
    sharedTracks,
    registerTracks,
} from 'src/services/audio-player-state'

// Keep one audio instance and playback state for the lifetime of the app module.
const sharedAudio = new Audio()
const sharedProgress = ref(0)
const sharedDuration = ref(0)
const sharedCurrentTime = ref(0)
const sharedIsLoading = ref(false)

const props = defineProps({
    tracks: {
        type: Array,
        default: () => []
    },
    // Set true when a fixed bottom footer nav is also present (mobile),
    // so the player bar sits above it instead of covering it.
    aboveFooter: {
        type: Boolean,
        default: false
    }
})

const audio = sharedAudio
const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
const currentId = sharedCurrentId
const isPlaying = sharedIsPlaying
const progress = sharedProgress
const duration = sharedDuration
const currentTime = sharedCurrentTime
const isLoading = sharedIsLoading
const isScrubbing = ref(false)
const scrubTrackEl = ref(null)
const emit = defineEmits([
    'update:playing',
    'update:currentId',
    'seek',
    'progress'
])
const getSrc = (track) => {
    if (!track?.file_src) return ''
    if (track.file_src.startsWith('http')) return track.file_src
    return `${import.meta.env.VITE_API_BASE_URL}/storage/${track.file_src}`
}

const getCoverArt = (track) => track?.release?.cover_art || track?.cover_art || ''

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

const playAudio = async (track) => {
    const src = getSrc(track)
    if (!src) return

    if (currentId.value === track.id) {
        togglePlay()
        return
    }
    isLoading.value = true
    audio.src = src
    currentId.value = track.id

    try {
        await audio.play()
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
        audio.pause()
        isPlaying.value = false
    } else {
        await audio.play()
        isPlaying.value = true
    }
    if (currentTrack.value) {
        showAudioNotification({ title: currentTrack.value.title, isPlaying: isPlaying.value })
    }
    emit('update:playing', isPlaying.value)
}

const stopAudio = () => {
    audio.pause()
    audio.currentTime = 0
    isPlaying.value = false
    progress.value = 0
    currentTime.value = 0
    currentId.value = null
    clearAudioNotification()
}

sharedPlayAudio.value = playAudio

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

audio.ontimeupdate = () => {
    if (audio.duration) {
        currentTime.value = audio.currentTime
        duration.value = audio.duration
        progress.value = audio.currentTime / audio.duration
        emit('progress', progress.value)

    }
}

audio.onloadedmetadata = () => {
    duration.value = audio.duration
}

audio.onended = () => {
    if (hasNext.value) {
        playNext()
    } else {
        isPlaying.value = false
        progress.value = 0
        currentTime.value = 0
        currentId.value = null
        clearAudioNotification()
    }
}

const seek = (e) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    if (!audio.duration) return
    audio.currentTime = percent * audio.duration
    emit('seek', percent)
}

const seekByClientX = (clientX) => {
    const el = scrubTrackEl.value
    if (!el || !audio.duration) return
    const rect = el.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    audio.currentTime = percent * audio.duration
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
    if (!audio.duration) return
    isScrubbing.value = true
    seekByClientX(e.clientX)
    window.addEventListener('pointermove', onScrubMove)
    window.addEventListener('pointerup', stopScrub)
    window.addEventListener('pointercancel', stopScrub)
}

const seekTo = (percent) => {
    if (!audio.duration) return
    audio.currentTime = percent * audio.duration
}
sharedSeekTo.value = seekTo
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
    <div v-if="currentTrack" class="player-bar fixed-bottom" :class="{ 'above-footer': aboveFooter }">

        <!-- SEEK BAR -->
        <div ref="scrubTrackEl" class="seek-track" @click="seek" @pointerdown.prevent="startScrub">
            <div class="seek-fill" :style="{ width: (progress * 100) + '%' }" />
            <div class="seek-thumb" :style="{ left: 'calc(' + (progress * 100) + '% - 5px)' }" />
        </div>

        <!-- PLAYER INNER -->
        <div class="player-inner">

            <!-- LEFT: Cover + Track Info -->
            <div class="track-info">
                <div class="cover-thumb">
                    <img v-if="getCoverArt(currentTrack)" :src="getCoverArt(currentTrack)" />
                    <q-icon v-else name="music_note" size="16px" color="grey-6" />
                </div>
                <div class="track-text">
                    <div class="track-title ellipsis">
                        {{ currentTrack.title || 'Untitled Beat' }}
                    </div>
                    <div class="track-status">
                        <span class="status-dot" :class="{ paused: !isPlaying }" />
                        <span class="status-label">{{ isPlaying ? 'Now Playing' : 'Paused' }}</span>
                    </div>
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

                <button v-if="!isAndroid" class="ctrl-btn stop-btn" aria-label="Stop" @click="stopAudio">
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
</template>
<style scoped>
.player-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    background: rgba(14, 11, 22, 0.98);
    border-top: 1px solid rgba(168, 85, 247, 0.22);
    border-radius: 14px 14px 0 0;
    box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* Sit above the mobile footer nav bar instead of covering it */
.player-bar.above-footer {
    bottom: 56px;
    padding-bottom: 0;
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
    padding: 0.6rem 0.85rem 0.7rem;
    gap: 0.55rem;
}

.track-info {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    min-width: 0;
}

.cover-thumb {
    width: 2.1rem;
    height: 2.1rem;
    border-radius: 0.5rem;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    overflow: hidden;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.cover-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.track-text {
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

.stop-btn {
    display: none;
}

.ctrl-btn.play-main {
    width: 2.6rem;
    height: 2.6rem;
    background: linear-gradient(135deg, #a855f7, #7c3aed);
    color: #fff;
    box-shadow: 0 2px 10px rgba(124, 58, 237, 0.4);
}

.ctrl-btn.play-main:hover {
    background: linear-gradient(135deg, #b968ff, #6d28d9);
    transform: scale(1.04);
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
        grid-template-columns: 1fr;
        padding: 0.7rem 0.85rem 0.95rem;
        gap: 0.65rem;
    }

    .track-info,
    .right-controls {
        justify-content: center;
    }

    .track-status {
        gap: 0.25rem;
    }

    .controls {
        order: -1;
        margin-bottom: 0.1rem;
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

    .stop-btn {
        display: flex;
    }

    .right-controls {
        justify-content: center;
        gap: 0.45rem;
        width: 100%;
    }

    .time-wrap {
        flex-wrap: nowrap;
        justify-content: center;
    }

    .time-val {
        min-width: 2rem;
    }

    .vol-wrap {
        display: none;
    }
}

@media (max-width: 600px) {
    .player-inner {
        padding: 0.62rem 0.6rem 0.78rem;
        gap: 0.5rem;
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

    .time-val,
    .time-sep {
        font-size: 0.65rem;
    }

    .time-wrap {
        gap: 0.28rem;
    }

    .seek-track {
        height: 0.22rem;
    }

    .seek-thumb {
        width: 0.8rem;
        height: 0.8rem;
        opacity: 1;
    }
}
</style>