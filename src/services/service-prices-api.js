import { ApiService } from 'src/services/api'

export default {
    getPrices() {
        return ApiService.get('/service-prices')
    },
}