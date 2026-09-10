<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useCartStore } from 'src/stores/cart'
import PaymentGateways from 'src/components/GatewaySelector.vue'
import { ApiService } from 'src/services/api'
const api = ApiService
const router = useRouter()
const $q = useQuasar()
const cart = useCartStore()
const completingCheckout = ref(false)

const description = computed(() => {
    const noun = cart.itemType === 'music' ? 'track(s)' : 'service(s)'
    if (cart.items.length === 1) return cart.items[0].name
    return `${cart.count} ${noun}`
})

const serviceType = computed(() => cart.items[0]?.service_type || '')

const mpesaEndpoint = computed(() =>
    cart.itemType === 'music' ? 'v1/payments/mpesa/music' : 'v1/payments/mpesa/services'
)
const ecocashEndpoint = computed(() =>
    cart.itemType === 'music' ? 'v1/payments/ecocash/music' : 'v1/payments/ecocash/services'
)
const paypalCreateOrderEndpoint = computed(() =>
    cart.itemType === 'music' ? 'v1/paypal/music/create-order' : 'v1/paypal/services/create-order'
)
const paypalCaptureOrderEndpoint = computed(() =>
    cart.itemType === 'music' ? 'v1/paypal/music/capture-order' : 'v1/paypal/services/capture-order'
)

const onPaid = async () => {
    if (completingCheckout.value) return

    completingCheckout.value = true
    const currentType = cart.itemType

    $q.notify({ type: 'positive', message: 'Payment successful!' })

    try {
        if (currentType === 'music') {
            await router.push({ name: 'downloads' })
            return
        }

        await router.push('/')
    } finally {
        cart.clear()
        completingCheckout.value = false
    }
}

const onPaymentError = (payload) => {
    console.log(payload)
    $q.notify({ type: 'negative', message: 'Payment failed. Please try again.' })
}

const music = ref([])

const addTrackToCart = (track) => {
    cart.addItem({
        id: track.id,
        name: track.title,
        price: track.price,
        type: 'music'
    })
}
const fetchMusic = async () => {
    try {
        const res = await api.get('/music')
        music.value = res.data.data
    } catch (err) {
        console.error(err)
        $q.notify({
            type: 'negative',
            message: 'Failed to load music'
        })
    }
}
onMounted(() => {
    fetchMusic()
})
</script>

<template>
    <q-page class="q-pa-md">

        <!-- <div v-if="cart.isEmpty" class="flex flex-center q-pa-xl column">
            <div class="text-grey-7 q-mb-md">Your cart is empty</div>
            <q-btn flat no-caps color="primary" label="Browse tracks" :to="{ name: 'tracks' }" />
        </div> -->
        <div v-if="cart.isEmpty" class="q-pa-md">

            <div class="text-center q-mb-lg">
                <div class="text-grey-7">Your cart is empty</div>
            </div>

            <q-list bordered separator>
                <q-item v-for="track in music" :key="track.id">
                    <q-item-section>
                        <q-item-label>{{ track.title }}</q-item-label>

                        <q-item-label caption>
                            {{ track.duration }} • M{{ track.price }}
                        </q-item-label>
                    </q-item-section>

                    <q-item-section side>
                        <q-btn color="primary" no-caps icon="add_shopping_cart" label="Add to Cart"
                            @click="addTrackToCart(track)" />
                    </q-item-section>
                </q-item>

                <q-item v-if="!music.length">
                    <q-item-section>
                        <q-item-label caption>
                            No tracks available
                        </q-item-label>
                    </q-item-section>
                </q-item>
            </q-list>

        </div>
        <template v-else>

            <q-list bordered separator class="q-mb-lg rounded-borders">
                <q-item v-for="item in cart.items" :key="item.id">
                    <q-item-section>
                        <q-item-label>{{ item.name }}</q-item-label>
                        <q-item-label caption>M{{ item.price }} each</q-item-label>
                    </q-item-section>

                    <q-item-section side>
                        <div class="row items-center q-gutter-sm">
                            <q-btn dense flat round icon="remove" size="sm"
                                @click="cart.setQuantity(item.id, item.quantity - 1)" />
                            <div>{{ item.quantity }}</div>
                            <q-btn dense flat round icon="add" size="sm"
                                @click="cart.setQuantity(item.id, item.quantity + 1)" />
                            <q-btn dense flat round icon="delete" size="sm" color="negative"
                                @click="cart.removeItem(item.id)" />
                        </div>
                    </q-item-section>
                </q-item>
            </q-list>

            <div class="text-h6 q-mb-lg">
                Total: M{{ cart.total }}
            </div>

            <PaymentGateways :amount="cart.total" :description="description" :service-type="serviceType"
                :item-id="cart.itemIds" :item-type="cart.itemType" :mpesa-endpoint="mpesaEndpoint"
                :ecocash-endpoint="ecocashEndpoint" :paypal-create-order-endpoint="paypalCreateOrderEndpoint"
                :paypal-capture-order-endpoint="paypalCaptureOrderEndpoint" @success="onPaid" @error="onPaymentError" />

        </template>

    </q-page>
</template>
