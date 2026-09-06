import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ApiService } from 'src/services/api'
import { registerTracks } from 'src/services/audio-player-state'

const api = ApiService

export const useMusicStore = defineStore('music', () => {
    const music = ref([])
    const loaded = ref(false)
    const loading = ref(false)

    const fetchMusic = async (force = false) => {
        if (loaded.value && !force) return music.value
        if (loading.value) return music.value

        loading.value = true
        try {
            const res = await api.get('/music')
            music.value = res.data.data
            registerTracks(music.value)
            loaded.value = true
            return music.value
        } finally {
            loading.value = false
        }
    }

    return { music, loaded, loading, fetchMusic }
})
