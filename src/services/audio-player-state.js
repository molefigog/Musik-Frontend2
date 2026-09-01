import { ref } from 'vue'

export const sharedTracks = ref([])
export const sharedCurrentId = ref(null)
export const sharedIsPlaying = ref(false)
export const sharedPlayAudio = ref(null)
export const sharedSeekTo = ref(null)
export const sharedProgress = ref(0)

export const registerTracks = (tracks) => {
    sharedTracks.value = Array.isArray(tracks) ? tracks : []
}

