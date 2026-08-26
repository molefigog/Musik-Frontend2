<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
//import { ApiService } from 'src/services/api'
import PaymentGateways from 'src/components/GatewaySelector.vue'
import { dummyServices } from 'src/composables/Services'
import { useCartStore } from 'src/stores/cart'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const cart = useCartStore()

const service = ref(null)
const loading = ref(true)
const loadError = ref('')

// const fetchService = async () => {
//     loading.value = true
//     loadError.value = ''

//     try {
//         // TODO: confirm this matches your real "get one service" endpoint
//         const res = await ApiService.get(`v1/services/${route.params.id}`)
//         service.value = res.data
//     } catch (error) {
//         console.log(error)
//         loadError.value = 'Unable to load this service. Please try again.'
//     } finally {
//         loading.value = false
//     }
// }

const fetchService = async () => {
    loading.value = true
    loadError.value = ''

    console.log('route.params.id is:', route.params.id)

    const match = dummyServices.find(s => s.id === Number(route.params.id))

    if (!match) {
        loadError.value = `No service found for id "${route.params.id}". Check the route is passing an :id param.`
    } else {
        service.value = match
    }

    loading.value = false
}

// eslint-disable-next-line no-unused-vars
const onServicePaid = (payload) => {
    $q.notify({ type: 'positive', message: 'Payment successful!' })
    // TODO: point this at wherever a paid-for service should land,
    // e.g. router.push({ name: 'service-confirmation', params: { id: service.value.id } })
    router.push({ name: 'services' })
}

const onPaymentError = (payload) => {
    console.log(payload)
    $q.notify({ type: 'negative', message: 'Payment failed. Please try again.' })
}

const addServiceToCart = () => {
    if (!service.value) return

    const added = cart.addItem({
        id: service.value.id,
        name: service.value.name,
        price: Number(service.value.price) || 0,
        type: 'service'
    }, 'service')

    if (added) {
        $q.notify({ type: 'positive', message: `${service.value.name} added to cart` })
        router.push({ name: 'cart-checkout' })
    } else {
        $q.notify({ type: 'warning', message: 'Your cart already contains a different item type' })
    }
}

onMounted(fetchService)
</script>

<template>
    <q-page class="tabs-page q-pa-md">

        <div v-if="loading" class="flex flex-center q-pa-xl">
            <q-spinner size="40px" color="primary" />
        </div>

        <div v-else-if="loadError" class="flex flex-center q-pa-xl">
            <div class="text-negative">{{ loadError }}</div>
        </div>

        <div v-else-if="service" class="column q-gutter-md">
            <div class="bg-grey-1 rounded-borders q-pa-md">
                <div class="text-h6 q-mb-sm">{{ service.name }}</div>
                <div class="text-body2 text-grey-7 q-mb-sm">{{ service.description }}</div>
                <div class="text-subtitle1">M{{ Number(service.price).toFixed(2) }}</div>
            </div>

            <div class="row q-gutter-sm">
                <q-btn color="primary" no-caps label="Add to cart" @click="addServiceToCart" />
                <q-btn flat no-caps label="View cart" :to="{ name: 'cart-checkout' }" />
            </div>

            <PaymentGateways :amount="service.price" :description="service.name" :item-id="service.id"
                item-type="service" mpesa-endpoint="v1/payments/mpesa/services"
                paypal-create-order-endpoint="v1/paypal/services/create-order"
                paypal-capture-order-endpoint="v1/paypal/services/capture-order" @success="onServicePaid"
                @error="onPaymentError" />
        </div>

    </q-page>
</template>
