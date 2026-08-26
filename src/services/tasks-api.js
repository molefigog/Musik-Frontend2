import { ApiService } from 'src/services/api'

export default {
    getTasks() {
        return ApiService.get('/tasks')
    },
    async createTask(payload) {
        try {
            return await ApiService.post('/tasks', payload)
        } catch (error) {
            if (error?.response?.status === 404) {
                return ApiService.post('/tasks/create', payload)
            }

            throw error
        }
    },
    getTask(id) {
        return ApiService.get(`/tasks/${id}`)
    },
}
