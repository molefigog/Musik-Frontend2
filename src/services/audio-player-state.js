import { ref } from 'vue'

// Single source of truth for the app-wide "session" audio player.
// Every page (IndexPage, SongDetails, DownloadsPage, TaskCard/TasksPage)
// reads/writes these refs instead of owning its own Audio() instance, so
// there is exactly one track playing at a time no matter which page you're
// looking at. AudioPlayer.vue (mounted once, in MainLayout.vue) is the only
// place that ever calls the underlying playback engine directly.

export const sharedTracks = ref([])
export const sharedCurrentId = ref(null)
export const sharedIsPlaying = ref(false)
export const sharedIsLoading = ref(false)
export const sharedProgress = ref(0)
export const sharedCurrentTime = ref(0)
export const sharedDuration = ref(0)

// Function refs published by AudioPlayer.vue once it mounts. Callers should
// always use optional chaining (sharedPlayAudio.value?.(track)) since these
// are null until the mini-player has mounted.
export const sharedPlayAudio = ref(null)
export const sharedSeekTo = ref(null)
export const sharedStopAudio = ref(null)

export const registerTracks = (tracks) => {
    sharedTracks.value = Array.isArray(tracks) ? tracks : []
}
