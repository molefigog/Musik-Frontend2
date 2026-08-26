import { ref } from 'vue'
import { ApiService } from 'src/services/api'

const api = ApiService

export function useCrud(endpoint) {
    const rows = ref([])
    const loading = ref(false)

    const getAll = async () => {
        loading.value = true

        const { data } = await api.get(endpoint)

        rows.value = data.data || data

        loading.value = false
    }

    const create = async (payload) => {
        return await api.post(endpoint, payload)
    }

    const update = async (id, payload) => {
        return await api.put(`${endpoint}/${id}`, payload)
    }

    const destroy = async (id) => {
        return await api.delete(`${endpoint}/${id}`)
    }

    return {
        rows,
        loading,
        getAll,
        create,
        update,
        destroy,
    }
}
