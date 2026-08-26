<script setup>
/**
 * PayPal Gateway (Capacitor / Android)
 * -------------------------------------------------------------------------
 * Flow:
 *   1. Button tap -> backend creates the PayPal order, returns approval_url
 *   2. Capacitor Browser plugin opens approval_url as an in-app browser
 *      (NOT window.location - that would navigate the WebView itself away
 *      from the app and lose all Vue state)
 *   3. PayPal redirects to a deep link (return_url or cancel_url) once the
 *      user approves/cancels in that browser
 *   4. Capacitor App's `appUrlOpen` listener catches the deep link, closes
 *      the browser, and reads the token/PayerID off the URL
 *   5. Backend captures/finalizes the order
 *
 * Requires:
 *   npm install @capacitor/browser @capacitor/app
 *   npx cap sync android
 *
 * The Android manifest needs an intent-filter (custom scheme or App Link)
 * matching whatever return_url / cancel_url your backend passes to PayPal
 * when creating the order - those URLs must contain `returnPath` /
 * `cancelPath` below as a substring.
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useQuasar } from 'quasar'
import { ApiService } from 'src/services/api'
import { Browser } from '@capacitor/browser'
import { App } from '@capacitor/app'

const $q = useQuasar()

const props = defineProps({
    title: {
        type: String,
        default: 'PayPal Gateway'
    },

    buttonLabel: {
        type: String,
        default: 'Pay with PayPal'
    },

    // backend endpoint that creates the PayPal order, must return { approval_url }
    createOrderEndpoint: {
        type: String,
        required: true
    },

    // backend endpoint that captures/finalizes an approved order
    captureOrderEndpoint: {
        type: String,
        required: true
    },

    amount: {
        type: Number,
        default: 1
    },

    description: {
        type: String,
        default: ''
    },

    // id of the track/album OR service being purchased - kept generic so this
    // one component works from either checkout flow unchanged
    itemId: {
        type: [String, Number],
        required: true
    },

    // must be a substring of the return_url / cancel_url registered with PayPal
    // and of the intent-filter configured in the Android manifest
    returnPath: {
        type: String,
        default: 'paypal-return'
    },

    cancelPath: {
        type: String,
        default: 'paypal-cancel'
    }
})

const emit = defineEmits(['success', 'cancelled', 'error'])

const loading = ref(false)
const statusMessage = ref('')

let waitDialog = null
let urlListener = null

const notify = (type, message) => {
    $q.notify({ type, message, position: 'top' })
}

const hideWaitDialog = () => {
    if (waitDialog) {
        waitDialog.hide()
        waitDialog = null
    }
}

const closeBrowserSafely = async () => {
    try {
        await Browser.close()
        // eslint-disable-next-line no-unused-vars
    } catch (e) {
        // already closed - safe to ignore
    }
}

const startPayPalPayment = async () => {
    loading.value = true
    statusMessage.value = ''

    try {
        const res = await ApiService.post(props.createOrderEndpoint, {
            amount: props.amount,
            item_id: props.itemId,
            description: props.description
        })

        const approvalUrl = res.data?.approval_url

        if (!approvalUrl) {
            throw new Error('No approval_url returned from server')
        }

        waitDialog = $q.dialog({
            title: props.title,
            message: `
        <div class="text-center q-pa-md">
          <div class="text-h6">
            Waiting for PayPal approval...
          </div>

          <div class="q-mt-md">
            Complete the payment in the browser, then return to the app.
          </div>
        </div>
      `,
            html: true,
            persistent: true,
            ok: false
        })

        await Browser.open({ url: approvalUrl })

    } catch (error) {
        console.log(error)

        statusMessage.value = 'Unable to start PayPal payment'

        notify(
            'negative',
            error?.response?.data?.message || statusMessage.value
        )

        emit('error', error)

    } finally {
        loading.value = false
    }
}

const captureOrder = async (token) => {
    loading.value = true

    try {
        const res = await ApiService.post(props.captureOrderEndpoint, {
            order_id: token
        })

        const data = res.data

        if (data.success) {
            statusMessage.value = '✅ Payment successful'
            notify('positive', 'Payment successful')
            emit('success', data)
        } else {
            statusMessage.value = data.message || '❌ Payment failed'
            notify('negative', statusMessage.value)
            emit('error', data)
        }

    } catch (error) {
        console.log(error)
        statusMessage.value = 'Error confirming PayPal payment'
        notify('negative', statusMessage.value)
        emit('error', error)

    } finally {
        loading.value = false
    }
}

const handleAppUrlOpen = async (event) => {
    const url = event?.url || ''

    if (url.includes(props.cancelPath)) {
        hideWaitDialog()
        await closeBrowserSafely()

        statusMessage.value = 'Payment cancelled'
        notify('warning', statusMessage.value)
        emit('cancelled')
        return
    }

    if (url.includes(props.returnPath)) {
        hideWaitDialog()
        await closeBrowserSafely()

        const params = new URL(url).searchParams
        const token = params.get('token')
        const payerId = params.get('PayerID')

        if (!token || !payerId) {
            statusMessage.value = 'Payment was not completed'
            notify('warning', statusMessage.value)
            emit('cancelled')
            return
        }

        await captureOrder(token)
    }
}

onMounted(async () => {
    urlListener = await App.addListener('appUrlOpen', handleAppUrlOpen)
})

onBeforeUnmount(() => {
    urlListener?.remove()
})
</script>

<template>
    <q-page class="payment-page">

        <div class="payment-wrapper">

            <!-- LEFT -->
            <div class="payment-info">

                <div class="hero-badge">
                    PayPal Gateway
                </div>

                <div class="hero-title fredoka">
                    Pay Safely <br />
                    with PayPal
                </div>

                <div class="hero-subtitle">
                    Approve the payment in your browser - no card details are ever stored in the app.
                </div>

                <div class="features">

                    <div class="feature-card">
                        <q-icon name="verified_user" size="26px" />
                        <div>
                            <div class="feature-title">
                                Buyer Protection
                            </div>
                            <div class="feature-text">
                                Covered by PayPal's policies
                            </div>
                        </div>
                    </div>

                    <div class="feature-card">
                        <q-icon name="public" size="26px" />
                        <div>
                            <div class="feature-title">
                                Globally Trusted
                            </div>
                            <div class="feature-text">
                                Accepted in 200+ markets
                            </div>
                        </div>
                    </div>

                    <div class="feature-card">
                        <q-icon name="lock" size="26px" />
                        <div>
                            <div class="feature-title">
                                Nothing Stored
                            </div>
                            <div class="feature-text">
                                Your details stay with PayPal
                            </div>
                        </div>
                    </div>

                </div>

            </div>

            <!-- RIGHT -->
            <q-card flat class="payment-card">

                <div class="hero-badge">
                    {{ title }}
                </div>

                <div class="card-title fredoka">
                    PayPal Payment
                </div>

                <div class="card-subtitle">
                    You'll be redirected to PayPal to approve this payment
                </div>

                <div class="form-section">

                    <!-- AMOUNT -->
                    <div class="feature-card">
                        <q-icon name="payments" size="26px" />
                        <div>
                            <div class="feature-title">
                                Amount: M{{ amount }}
                            </div>
                            <div class="feature-text">
                                {{ description }}
                            </div>
                        </div>
                    </div>

                    <!-- STATUS -->
                    <div v-if="statusMessage" class="status-box">
                        {{ statusMessage }}
                    </div>

                    <!-- BUTTON -->
                    <div class="btn-wrap">
                        <q-btn unelevated no-caps :loading="loading" class="pay-btn" @click="startPayPalPayment">
                            <q-icon name="account_balance_wallet" class="q-mr-sm" />
                            {{ buttonLabel }}
                        </q-btn>
                    </div>

                </div>

            </q-card>

        </div>

    </q-page>
</template>