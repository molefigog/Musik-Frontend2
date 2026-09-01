// eslint-disable-next-line no-unused-vars
import { ref, computed, watch } from 'vue'

export function useAudioPlayer() {
    let audio = null
    const currentId = ref(null)
    const isPlaying = ref(false)
    const progress = ref(0)
    const currentTime = ref(0)

    const initializeAudio = (trackId, fileSource) => {
        if (currentId.value !== trackId) {
            if (audio) {
                audio.pause()
                audio = null
            }
            audio = new Audio(fileSource)
            currentId.value = trackId

            audio.addEventListener('timeupdate', () => {
                currentTime.value = audio.currentTime
                progress.value = audio.duration ? audio.currentTime / audio.duration : 0
            })

            audio.addEventListener('ended', () => {
                isPlaying.value = false
                progress.value = 0
                currentTime.value = 0
            })
        }
    }

    const togglePlay = (trackId, fileSource) => {
        if (!fileSource) return

        initializeAudio(trackId, fileSource)

        if (isPlaying.value) {
            audio.pause()
            isPlaying.value = false
        } else {
            audio.play()
            isPlaying.value = true
        }
    }

    const seekTrack = (trackId, event) => {
        if (!audio || currentId.value !== trackId) return
        const rect = event.currentTarget.getBoundingClientRect()
        const ratio = (event.clientX - rect.left) / rect.width
        audio.currentTime = ratio * (audio.duration || 0)
    }

    const stopAudio = () => {
        if (audio) {
            audio.pause()
            audio = null
        }
        isPlaying.value = false
        currentId.value = null
        progress.value = 0
        currentTime.value = 0
    }

    const cleanup = () => {
        if (audio) audio.pause()
    }

    return {
        currentId,
        isPlaying,
        progress,
        currentTime,
        togglePlay,
        seekTrack,
        stopAudio,
        cleanup,
    }
}
