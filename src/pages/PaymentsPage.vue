<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

import CpayTab from 'src/components/CpayTab.vue'
import CardTab from 'src/components/CardTab.vue'
import PaymentCard from 'src/components/MpesaTab.vue'
import PaypalTab from 'src/components/PaypalTab.vue'
import { useCartStore } from 'src/stores/cart'

const tab = ref('cpay')
const router = useRouter()
const $q = useQuasar()
const cart = useCartStore()

const paymentOptions = {
    cpay: { id: 'cpay-otp', name: 'CPay OTP', price: 1 },
    cpay_card: { id: 'cpay-card', name: 'CPay Card', price: 1 },
    mpesa_c2b: { id: 'mpesa-c2b', name: 'M-Pesa C2B', price: 1 },
    mpesa_b2c: { id: 'mpesa-b2c', name: 'M-Pesa B2C', price: 1 },
    paypal: { id: 'paypal', name: 'PayPal', price: 1 },
}

const currentPayment = computed(() => paymentOptions[tab.value] || paymentOptions.cpay)

const addSelectedPaymentToCart = () => {
    const item = currentPayment.value

    if (!item) return

    const added = cart.addItem({
        id: item.id,
        name: item.name,
        price: Number(item.price) || 0,
        type: 'service'
    }, 'service')

    if (added) {
        $q.notify({ type: 'positive', message: `${item.name} added to cart` })
        router.push({ name: 'cart-checkout' })
    } else {
        $q.notify({ type: 'warning', message: 'Your cart already contains a different item type' })
    }
}
</script>

<template>
    <q-page class="tabs-page q-pa-md">

        <div class="tabs-wrapper">
            <!-- SIDEBAR -->
            <div class="tabs-sidebar">
                <div v-if="$q.screen.gt.sm" class="sidebar-header">
                    <div class="text-h5 text-weight-bold text-white fredoka">
                        Payments
                    </div>
                    <div class="text-caption text-grey-4 q-mt-sm">
                        Select payment method
                    </div>
                </div>
                <!-- TABS -->
                <q-tabs v-model="tab" :vertical="$q.screen.gt.sm" :inline-label="!$q.screen.gt.sm" active-color="white"
                    indicator-color="transparent" class="glass-tabs">
                    <!-- CPAY -->
                    <q-tab name="cpay" icon="shield" :label="$q.screen.gt.sm ? 'CPay OTP' : ''" class="custom-tab" />
                    <!-- CARD -->
                    <q-tab name="cpay_card" icon="credit_card" :label="$q.screen.gt.sm ? 'CPay Card' : ''"
                        class="custom-tab" />
                    <!-- MPESA C2B -->
                    <q-tab name="mpesa_c2b" icon="payments" :label="$q.screen.gt.sm ? 'M-Pesa C2B' : ''"
                        class="custom-tab" />
                    <!-- MPESA B2C -->
                    <q-tab name="mpesa_b2c" icon="account_balance_wallet" :label="$q.screen.gt.sm ? 'M-Pesa B2C' : ''"
                        class="custom-tab" />

                    <!-- PAYPAL -->
                    <q-tab name="paypal" icon="payments" :label="$q.screen.gt.sm ? 'PayPal' : ''" class="custom-tab" />
                </q-tabs>
            </div>
            <!-- CONTENT -->
            <div class="tabs-content">
                <div class="row items-center justify-between q-mb-md q-gutter-sm">
                    <div>
                        <div class="text-subtitle1 text-weight-medium text-white">Cart checkout</div>
                        <div class="text-caption text-grey-4">{{ currentPayment.name }}</div>
                    </div>

                    <div class="row items-center q-gutter-sm">
                        <q-chip dense color="primary" text-color="white">{{ cart.count }} item(s)</q-chip>
                        <q-btn color="primary" no-caps label="Add selected method" @click="addSelectedPaymentToCart" />
                        <q-btn flat no-caps label="View cart" :to="{ name: 'cart-checkout' }" />
                    </div>
                </div>

                <q-tab-panels v-model="tab" animated swipeable class="glass-panels">
                    <!-- CPAY -->
                    <q-tab-panel name="cpay" class="panel-bg">
                        <CpayTab />
                    </q-tab-panel>
                    <!-- CARD -->
                    <q-tab-panel name="cpay_card" class="panel-bg">
                        <CardTab />
                    </q-tab-panel>
                    <!-- MPESA C2B -->
                    <q-tab-panel name="mpesa_c2b" class="panel-bg">

                        <PaymentCard title="C2B LSL1,00" button-label="Pay LSL1,00" endpoint="/charge" method="post"
                            :amount="1" :music-id="12" description="Track 1"
                            description-field="input_PurchasedItemsDesc" icon="payments" chip-color="info" />
                    </q-tab-panel>
                    <!-- MPESA B2C -->
                    <q-tab-panel name="mpesa_b2c" class="panel-bg">
                        <PaymentCard title="B2C LSL1,00" button-label="Withdraw LSL1,00" endpoint="/b2c" method="get"
                            :amount="1" :music-id="12" description="Salary payment"
                            description-field="input_PaymentItemsDesc" icon="account_balance_wallet"
                            chip-color="primary" />

                    </q-tab-panel>
                    <!-- PAYPAL -->
                    <q-tab-panel name="paypal" class="panel-bg">
                        <PaypalTab />
                    </q-tab-panel>
                </q-tab-panels>
            </div>

        </div>
    </q-page>
</template>
