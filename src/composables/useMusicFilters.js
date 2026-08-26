import { computed } from 'vue'

export function useMusicFilters(music, filters) {
    const filteredMusic = computed(() => {
        return music.value.filter((track) => {
            // SEARCH
            if (filters.value.search) {
                const q = filters.value.search.toLowerCase()

                const matches =
                    track.title?.toLowerCase().includes(q) ||
                    track.release?.title?.toLowerCase().includes(q) ||
                    track.release?.name?.toLowerCase().includes(q) ||
                    track.genre?.name?.toLowerCase().includes(q) ||
                    track.genre?.title?.toLowerCase().includes(q)

                if (!matches) return false
            }

            // GENRE
            if (
                filters.value.genre &&
                String(track.genre_id ?? track.genre?.id ?? '') !== String(filters.value.genre)
            ) {
                return false
            }

            // RELEASE
            if (
                filters.value.release &&
                String(track.release_id ?? track.release?.id ?? '') !== String(filters.value.release)
            ) {
                return false
            }

            // PRICE
            const price = Number(track.price || 0)

            if (filters.value.price === 'free' && price > 0) {
                return false
            }

            if (filters.value.price === 'paid' && price <= 0) {
                return false
            }

            // LETTER
            if (filters.value.letter) {
                const starts = track.title?.toUpperCase().startsWith(filters.value.letter)

                if (!starts) return false
            }

            return true
        })
    })

    return {
        filteredMusic,
    }
}
