import axios from 'axios'
import { isLoading } from './loading'
import { getApiPath } from 'boot/api-config'
import { useAuthStore } from 'stores/auth'

const api = axios.create({
    baseURL: getApiPath(),
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
})

api.interceptors.request.use((config) => {
    isLoading.value = true

    const auth = useAuthStore()

    if (auth.token) {
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${auth.token}`
    }

    return config
})

api.interceptors.response.use(
    (res) => {
        isLoading.value = false
        return res
    },
    (err) => {
        isLoading.value = false
        return Promise.reject(err)
    },
)

export const ApiService = {
    get: (url, config = {}) => api.get(url, config),
    post: (url, data = {}, config = {}) => api.post(url, data, config),
    patch: (url, data = {}, config = {}) => api.patch(url, data, config),
    put: (url, data = {}, config = {}) => api.put(url, data, config),
    delete: (url, config = {}) => api.delete(url, config),
    download: (url, config = {}) => api.get(url, { ...config, responseType: 'blob' }),
}

