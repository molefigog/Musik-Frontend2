import { getApiPath } from 'boot/api-config'
import { ApiService } from './api'

export const mediaUrl = (path) => {
    if (!path) return ''
    if (/^https?:\/\//i.test(path)) return path
    const apiPath = getApiPath() || ''
    const origin = apiPath.replace(/\/api\/?$/, '').replace(/\/$/, '')
    return `${origin}/storage/${String(path).replace(/^public\//, '')}`
}

export const releasesApi = {
    async list() {
        const { data } = await ApiService.get('releases')
        return data.data || data
    },
    async get(id) {
        const { data } = await ApiService.get(`releases/${id}`)
        return data.data || data
    },
    async create(form) {
        const { data } = await ApiService.post('releases', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return data.data || data
    },
    async update(id, form) {
        form.append('_method', 'PUT')
        const { data } = await ApiService.post(`releases/${id}`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return data.data || data
    },
    async remove(id) {
        return ApiService.delete(`releases/${id}`)
    },
    async tracks(id) {
        const { data } = await ApiService.get(`releases/${id}/all-music`)
        return data.data || data
    },
    async addTrack(id, form) {
        const { data } = await ApiService.post(`releases/${id}/all-music`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return data.data || data
    },
    async uploadTrack(form, onUploadProgress) {
        const { data } = await ApiService.post('track-upload', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress,
        })
        return data
    },
    async updateTrack(data) {
        const response = await ApiService.patch('update-track', data)
        return response.data.data || response.data
    },
    async revertUpload(tempPath) {
        return ApiService.post('revert-upload', { temp_path: tempPath })
    },
    async saveWaveform(musicId, blob, published = true) {
        const form = new FormData()
        form.append('waveform_file', blob, 'waveform.png')
        form.append('is_published', published ? '1' : '0')
        const { data } = await ApiService.post(`music/${musicId}/waveform`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return data
    },
}
