<script setup>

import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useQuasar } from 'quasar'
import { ApiService } from 'src/services/api'
import { useAuthStore } from 'stores/auth'
import { Browser } from '@capacitor/browser'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

const props = defineProps({
    // ---- shared across every method ----
    amount: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    itemId: {
        // single id for a one-item checkout, or an array of ids for a cart
        type: [String, Number, Array],
        required: true
    },
    itemType: {
        type: String,
        default: 'music' // 'music' | 'service' - label only, keep the two flows separate at the parent level
    },
    serviceType: {
        type: String,
        default: ''
    },
    defaultMethod: {
        type: String,
        default: 'card' // 'card' | 'mobile' | 'mpesa' | 'paypal'
    },
    buttonLabel: {
        type: String,
        default: 'Pay Now'
    },

    // ---- C-Pay Card ----
    cpayCardEndpoint: {
        type: String,
        default: 'v1/cpay/card'
    },

    // ---- C-Pay Mobile (OTP) ----
    cpayPayEndpoint: {
        type: String,
        default: 'v1/cpay/pay'
    },
    cpayConfirmEndpoint: {
        type: String,
        default: 'v1/cpay/confirm'
    },

    // ---- M-Pesa ----
    mpesaEndpoint: {
        type: String,
        required: true
    },
    mpesaMethod: {
        type: String,
        default: 'post' // 'post' | 'get'
    },
    mpesaDescriptionField: {
        type: String,
        default: 'input_PurchasedItemsDesc'
    },

    // ---- PayPal ----
    paypalCreateOrderEndpoint: {
        type: String,
        required: true
    },
    paypalCaptureOrderEndpoint: {
        type: String,
        required: true
    },
    paypalReturnPath: {
        type: String,
        default: '/paypal/result'
    },
    paypalCancelPath: {
        type: String,
        default: '/paypal/cancel'
    }
})

const emit = defineEmits(['success', 'error', 'cancelled', 'initialized'])

const $q = useQuasar()
const auth = useAuthStore()

// ---------- shared state ----------
const selectedMethod = ref(props.defaultMethod)
const loading = ref(false)
const statusMessage = ref('')
const msisdn = ref('') // shared by card / mobile / mpesa - same real-world phone number

const methodOptions = ref([
    { label: 'Cpay Card', value: 'card', icon: 'credit_card' },
    { label: 'Cpay Mobile', value: 'mobile', icon: 'smartphone' },
    { label: 'M-Pesa', value: 'mpesa', icon: 'payments' },
    { label: 'PayPal', value: 'paypal', icon: 'account_balance_wallet' }
])

const loadPaymentGateways = async () => {
    try {
        const response = await ApiService.get('/v1/payment-gateways')
        const enabled = new Set((response.data?.data || []).map((gateway) => gateway.slug))
        methodOptions.value = methodOptions.value.filter((option) => enabled.has(option.value))

        if (!enabled.has(selectedMethod.value)) {
            selectedMethod.value = methodOptions.value[0]?.value || ''
        }
    } catch (error) {
        console.warn('Unable to load payment gateways', error)
    }
}

// ---------- card-only state ----------
const cardEmail = ref('')
const showCardModal = ref(false)
const cardIframeSrc = ref(null)

// ---------- mobile-otp-only state ----------
const otp = ref('')
const mobileTransactionId = ref(null)
const showOtpModal = ref(false)

const mpesaPollUi = ref({
    status: '',
    attempt: 0,
    maxAttempts: 0,
    checkedAt: '',
    source: '',
    queryReference: '',
    conversationId: ''
})

// ---------- paypal-only state (not reactive - never rendered) ----------
let paypalWaitDialog = null
let paypalUrlListener = null

watch(selectedMethod, () => {
    statusMessage.value = ''
    otp.value = ''
    mobileTransactionId.value = null
    showOtpModal.value = false
})

const currentSubtitle = computed(() => {
    if (selectedMethod.value === 'card') return 'Fill in your card details below'
    if (selectedMethod.value === 'mobile') return 'Secure mobile transaction'
    if (selectedMethod.value === 'mpesa') return 'Secure mobile payment experience'
    if (selectedMethod.value === 'paypal') return "You'll be redirected to PayPal to approve this payment"
    return ''
})

// =====================================================================
// CARD
// =====================================================================
const payWithCard = async () => {
    loading.value = true
    statusMessage.value = ''

    try {
        const res = await ApiService.post(
            props.cpayCardEndpoint,
            {
                msisdn: msisdn.value,
                amount: props.amount,
                email: cardEmail.value,
                item_id: props.itemId,
                item_type: props.itemType,
                description: props.description,
                service_type: props.serviceType,
                title: props.description
            },
            {
                headers: {
                    Authorization: `Bearer ${auth.token}`
                }
            }
        )

        const data = res.data
        showCardModal.value = true
        cardIframeSrc.value = null

        if (data.type === 'html') {
            const match = data.html.match(/src="([^"]+)"/)
            cardIframeSrc.value = match ? match[1] : null
        } else if (data.redirect_url) {
            cardIframeSrc.value = data.redirect_url
        }

        statusMessage.value = 'Payment initialized'
        $q.notify({ type: 'positive', message: 'Payment initialized' })

        // NOTE: this gateway has no completion callback from the iframe -
        // "initialized" only means the modal opened, not that money was received.
        emit('initialized', { method: 'card', data })

    } catch (error) {
        console.log(error)
        statusMessage.value = 'Payment failed'

        $q.notify({
            type: 'negative',
            message: error?.response?.data?.message || 'Payment failed'
        })

        emit('error', { method: 'card', error })

    } finally {
        loading.value = false
    }
}

const closeCardModal = () => {
    showCardModal.value = false
    cardIframeSrc.value = null
}

// =====================================================================
// MOBILE MONEY (OTP)
// =====================================================================
const payWithMobile = async () => {
    if (!msisdn.value) {
        $q.notify({ type: 'warning', message: 'Phone number is required', position: 'top' })
        return
    }

    loading.value = true
    statusMessage.value = ''

    try {
        const res = await ApiService.post(props.cpayPayEndpoint, {
            msisdn: msisdn.value,
            amount: props.amount,
            item_id: props.itemId,
            item_type: props.itemType,
            description: props.description
        })

        const data = res.data
        const otpRequested =
            data?.success === true ||
            data?.status === 'otpSent' ||
            data?.status === 'otp_required' ||
            data?.requires_otp === true
        const transactionId = data?.transaction_id || data?.transactionId || data?.reference || null

        if (otpRequested && transactionId) {
            mobileTransactionId.value = transactionId
            showOtpModal.value = true
            otp.value = ''

            statusMessage.value = data?.message || 'OTP sent. Confirm payment to continue.'
            $q.notify({ type: 'info', message: statusMessage.value, position: 'top' })

        } else {
            statusMessage.value = data?.message || 'Unable to initialize OTP payment'
            $q.notify({ type: 'warning', message: statusMessage.value, position: 'top' })
            emit('error', { method: 'mobile', data })
        }

    } catch (error) {
        console.log(error)
        statusMessage.value = 'Error sending payment'
        $q.notify({ type: 'negative', message: statusMessage.value, position: 'top' })
        emit('error', { method: 'mobile', error })

    } finally {
        loading.value = false
    }
}

const confirmMobileOtp = async () => {
    if (!mobileTransactionId.value) {
        $q.notify({ type: 'negative', message: 'Missing transaction reference. Start again.', position: 'top' })
        return
    }

    if (!otp.value || otp.value.length < 4) {
        $q.notify({ type: 'warning', message: 'Enter a valid OTP', position: 'top' })
        return
    }

    loading.value = true
    statusMessage.value = ''

    try {
        const res = await ApiService.post(props.cpayConfirmEndpoint, {
            transaction_id: mobileTransactionId.value,
            msisdn: msisdn.value,
            amount: Number(props.amount),
            otp: otp.value,
            item_id: props.itemId,
            item_type: props.itemType,
            service_type: props.serviceType,
            title: props.description
        })

        const data = res.data

        if (data.success) {
            statusMessage.value = 'Payment successful!'
            $q.notify({ type: 'positive', message: 'Payment successful!', position: 'top' })

            showOtpModal.value = false
            otp.value = ''
            mobileTransactionId.value = null

            emit('success', { method: 'mobile', data })

        } else {
            statusMessage.value = data.message || 'Payment failed'
            $q.notify({ type: 'negative', message: statusMessage.value, position: 'top' })
            emit('error', { method: 'mobile', data })
        }

    } catch (error) {
        console.log(error)
        statusMessage.value = 'Error confirming payment'
        $q.notify({ type: 'negative', message: statusMessage.value, position: 'top' })
        emit('error', { method: 'mobile', error })

    } finally {
        loading.value = false
    }
}

const closeOtpModal = () => {
    showOtpModal.value = false
    otp.value = ''
    mobileTransactionId.value = null
}

// =====================================================================
// M-PESA
// =====================================================================
const payWithMpesa = async () => {
    loading.value = true
    statusMessage.value = ''

    const form = {
        input_Amount: props.amount,
        input_CustomerMSISDN: msisdn.value,
        [props.mpesaDescriptionField]: props.description,
        service_type: props.serviceType,
        title: props.description,
        // backend field name kept as-is - confirm with your API whether this
        // should be renamed when itemType is 'service' rather than 'music'.
        // Cart purchases send a comma-separated list of ids here since
        // FormData fields are scalar strings - have the backend split on ','
        input_MusicId: Array.isArray(props.itemId) ? props.itemId.join(',') : props.itemId
    }

    mpesaPollUi.value = {
        status: 'initializing',
        attempt: 0,
        maxAttempts: 0,
        checkedAt: '',
        source: '',
        queryReference: '',
        conversationId: ''
    }

    let dialog
    const createPendingDialog = () => {
        const dlg = $q.dialog({
            title: 'M-Pesa Payment in Progress',
            message: `
            <div class="q-pa-md">
                <div class="text-h6 text-weight-medium text-center">
                    Confirm on your phone
                </div>
                <div class="q-mt-sm text-center text-grey-8">
                    We sent an STK push to <strong>${msisdn.value || 'your number'}</strong>.
                </div>
                <div class="q-mt-md text-center">
                    Enter your M-Pesa PIN on your phone to complete payment.
                </div>
            </div>
        `,
            html: true,
            persistent: true,
            noEscDismiss: true,
            noBackdropDismiss: true,
            ok: false,
            cancel: {
                label: 'Dismiss',
                flat: true,
                color: 'negative'
            }
        })

        dlg.onCancel(() => {
            $q.dialog({
                title: 'Dismiss payment status?',
                message: 'Payment may still complete in the background. Are you sure you want to dismiss this status window?',
                persistent: true,
                ok: {
                    label: 'Yes, dismiss',
                    color: 'negative'
                },
                cancel: {
                    label: 'Keep waiting',
                    flat: true
                }
            }).onOk(() => {
                statusMessage.value = 'Payment is still processing. You can continue using the app.'
            }).onCancel(() => {
                dialog = createPendingDialog()
            })
        })

        return dlg
    }

    dialog = createPendingDialog()

    const waitMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    const pollMpesaStatus = async (conversationId) => {
        const maxAttempts = 80
        const intervalMs = 3000

        mpesaPollUi.value = {
            ...mpesaPollUi.value,
            maxAttempts,
            conversationId,
            status: 'pending'
        }

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const statusRes = await ApiService.get('v1/payments/mpesa/status', {
                    params: {
                        conversation_id: conversationId
                    }
                })

                const statusData = statusRes.data || {}
                const status = String(statusData.status || '').toLowerCase()
                const poll = statusData.poll || {}

                mpesaPollUi.value = {
                    ...mpesaPollUi.value,
                    status,
                    attempt: Number(poll.attempt || attempt),
                    checkedAt: String(poll.checked_at || ''),
                    source: String(poll.source || ''),
                    queryReference: String(poll.query_reference || statusData.query_reference || '')
                }

                if (status === 'completed') {
                    return statusData
                }

                if (status === 'failed') {
                    return statusData
                }
            } catch (pollError) {
                console.warn('M-Pesa status poll failed, retrying...', pollError)
                mpesaPollUi.value = {
                    ...mpesaPollUi.value,
                    status: 'pending',
                    attempt,
                    source: 'client-retry'
                }
            }

            statusMessage.value = `Waiting for M-Pesa confirmation... (${attempt}/${maxAttempts})`
            await waitMs(intervalMs)
        }

        mpesaPollUi.value = {
            ...mpesaPollUi.value,
            status: 'pending',
            attempt: maxAttempts
        }

        return { status: 'pending' }
    }

    try {
        let response

        if (props.mpesaMethod.toLowerCase() === 'get') {
            response = await ApiService.get(props.mpesaEndpoint, { params: form })
        } else {
            const formData = new FormData()
            Object.keys(form).forEach((key) => {
                formData.append(key, form[key])
            })

            response = await ApiService.post(props.mpesaEndpoint, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
        }

        const charge = response.data?.charge
        const conversationId =
            response.data?.payment?.conversation_id ||
            charge?.output_ThirdPartyConversationID ||
            null

        mpesaPollUi.value = {
            ...mpesaPollUi.value,
            conversationId: String(conversationId || ''),
            queryReference: String(charge?.output_ConversationID || ''),
            status: 'pending'
        }

        if (charge?.output_ResponseCode === 'INS-0' && conversationId) {
            const statusData = await pollMpesaStatus(conversationId)
            const status = String(statusData?.status || '').toLowerCase()

            dialog?.hide()

            if (status === 'completed') {
                statusMessage.value = 'Payment completed successfully'
                mpesaPollUi.value = {
                    ...mpesaPollUi.value,
                    status: 'completed'
                }

                $q.dialog({
                    title: 'Payment Successful',
                    message: `
          <div class="q-pa-sm">
            <div class="text-positive text-h6 text-weight-bold">
              Payment Completed Successfully
            </div>
            <div class="q-mt-md">
              <strong>Transaction ID:</strong><br>
                            ${statusData?.txn_id || statusData?.query?.output_OriginalTransactionID || 'N/A'}
            </div>
            <div class="q-mt-md">
              <strong>Status:</strong><br>
                            ${statusData?.query?.output_ResponseTransactionStatus || 'Completed'}
            </div>
            <div class="q-mt-md">
              <strong>Conversation ID:</strong><br>
                            ${conversationId}
            </div>
          </div>
        `,
                    html: true
                })

                emit('success', { method: 'mpesa', data: statusData })

            } else if (status === 'failed') {
                statusMessage.value = statusData?.query?.output_ResponseDesc || 'Transaction failed'
                mpesaPollUi.value = {
                    ...mpesaPollUi.value,
                    status: 'failed'
                }

                $q.dialog({
                    title: 'Payment Failed',
                    message: `
                    <div class="q-pa-sm">
                        <div class="text-negative text-h6 text-weight-bold">
                            Transaction Failed
                        </div>
                        <div class="q-mt-md">
                            ${statusData?.query?.output_ResponseDesc || 'Unknown error occurred'}
                        </div>
                    </div>
                `,
                    html: true
                })

                emit('error', { method: 'mpesa', data: statusData })
            } else {
                statusMessage.value = 'Payment still pending. You can safely continue and check transaction status later.'

                $q.notify({
                    type: 'warning',
                    message: statusMessage.value,
                    position: 'top'
                })
            }

        } else {
            dialog?.hide()
            statusMessage.value = charge?.output_ResponseDesc || 'Transaction failed'
            mpesaPollUi.value = {
                ...mpesaPollUi.value,
                status: 'failed'
            }

            $q.dialog({
                title: 'Payment Failed',
                message: `
          <div class="q-pa-sm">
            <div class="text-negative text-h6 text-weight-bold">
              Transaction Failed
            </div>
            <div class="q-mt-md">
                            ${charge?.output_ResponseDesc || 'Unknown error occurred'}
            </div>
          </div>
        `,
                html: true
            })

            emit('error', { method: 'mpesa', data: charge })
        }

    } catch (error) {
        dialog?.hide()
        console.error(error)

        statusMessage.value =
            error?.response?.data?.message || error.message || 'Unable to process payment'
        mpesaPollUi.value = {
            ...mpesaPollUi.value,
            status: 'error'
        }

        $q.dialog({
            title: 'Server Error',
            message: `
        <div class="q-pa-sm">
          <div class="text-negative text-h6 text-weight-bold">
            Request Failed
          </div>
          <div class="q-mt-md">
            ${statusMessage.value}
          </div>
        </div>
      `,
            html: true
        })

        emit('error', { method: 'mpesa', error })

    } finally {
        loading.value = false
    }
}

// =====================================================================
// PAYPAL
// =====================================================================
const closePaypalBrowserSafely = async () => {
    try {
        await Browser.close()
        // eslint-disable-next-line no-unused-vars
    } catch (e) {
        // already closed - safe to ignore
    }
}

const hidePaypalWaitDialog = () => {
    if (paypalWaitDialog) {
        paypalWaitDialog.hide()
        paypalWaitDialog = null
    }
}

const payWithPaypal = async () => {
    loading.value = true
    statusMessage.value = ''

    try {
        const webResultUrl = `${window.location.origin}/paypal/result`
        const useNativeDeepLink = Capacitor.isNativePlatform()
        const nativeResultUrl = 'com.streama.app://paypal-callback'

        const res = await ApiService.post(props.paypalCreateOrderEndpoint, {
            amount: props.amount,
            item_id: props.itemId,
            item_type: props.itemType,
            description: props.description,
            service_type: props.serviceType,
            title: props.description,
            client: useNativeDeepLink ? 'mobile' : 'web',
            return_url: useNativeDeepLink ? nativeResultUrl : webResultUrl,
            cancel_url: useNativeDeepLink ? nativeResultUrl : webResultUrl
        })

        const approvalUrl = res.data?.approval_url

        if (!approvalUrl) {
            throw new Error('No approval_url returned from server')
        }

        paypalWaitDialog = $q.dialog({
            title: 'PayPal Payment',
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
            ok: false,
            cancel: {
                label: 'Dismiss',
                flat: true,
                color: 'negative'
            }
        })

        paypalWaitDialog.onCancel(() => {
            hidePaypalWaitDialog()
            statusMessage.value = 'Payment is still processing. You can continue using the app.'
        })

        if (Capacitor.isNativePlatform()) {
            await Browser.open({ url: approvalUrl })
        } else {
            window.location.href = approvalUrl
        }

    } catch (error) {
        console.log(error)
        statusMessage.value = 'Unable to start PayPal payment'

        $q.notify({
            type: 'negative',
            message: error?.response?.data?.message || statusMessage.value,
            position: 'top'
        })

        emit('error', { method: 'paypal', error })

    } finally {
        loading.value = false
    }
}

const capturePaypalOrder = async (token, payerId = null) => {
    loading.value = true

    try {
        const res = await ApiService.post(props.paypalCaptureOrderEndpoint, {
            order_id: token,
            payer_id: payerId
        })

        const data = res.data

        if (data.success) {
            statusMessage.value = '✅ Payment successful'
            $q.notify({ type: 'positive', message: 'Payment successful', position: 'top' })
            emit('success', { method: 'paypal', data })
        } else {
            statusMessage.value = data.message || '❌ Payment failed'
            $q.notify({ type: 'negative', message: statusMessage.value, position: 'top' })
            emit('error', { method: 'paypal', data })
        }

    } catch (error) {
        console.log(error)
        statusMessage.value = 'Error confirming PayPal payment'
        $q.notify({ type: 'negative', message: statusMessage.value, position: 'top' })
        emit('error', { method: 'paypal', error })

    } finally {
        loading.value = false
    }
}

const handlePaypalAppUrlOpen = async (event) => {
    const url = event?.url || ''
    if (!url.startsWith('com.streama.app://paypal-callback')) return

    const params = new URL(url).searchParams
    const token = params.get('token')
    const payerId = params.get('PayerID')
    const status = (params.get('status') || '').toLowerCase()
    const txn = params.get('txn')

    if (params.get('cancel') === 'true' || status === 'cancelled') {
        hidePaypalWaitDialog()
        await closePaypalBrowserSafely()

        statusMessage.value = 'Payment cancelled'
        $q.notify({ type: 'warning', message: statusMessage.value, position: 'top' })
        emit('cancelled', { method: 'paypal' })
        return
    }

    hidePaypalWaitDialog()
    await closePaypalBrowserSafely()

    if (status) {
        if (status === 'completed') {
            statusMessage.value = '✅ Payment successful'
            $q.notify({ type: 'positive', message: 'Payment successful', position: 'top' })
            emit('success', { method: 'paypal', data: { status, txn } })
        } else if (status === 'cancelled') {
            statusMessage.value = 'Payment cancelled'
            $q.notify({ type: 'warning', message: statusMessage.value, position: 'top' })
            emit('cancelled', { method: 'paypal', data: { status } })
        } else {
            statusMessage.value = '❌ Payment failed'
            $q.notify({ type: 'negative', message: statusMessage.value, position: 'top' })
            emit('error', { method: 'paypal', data: { status, txn } })
        }
        return
    }

    if (!token || !payerId) {
        statusMessage.value = 'Payment was not completed'
        $q.notify({ type: 'warning', message: statusMessage.value, position: 'top' })
        emit('cancelled', { method: 'paypal' })
        return
    }

    await capturePaypalOrder(token, payerId)
}

onMounted(async () => {
    await loadPaymentGateways()
    paypalUrlListener = await App.addListener('appUrlOpen', handlePaypalAppUrlOpen)
    const launchUrl = await App.getLaunchUrl()
    if (launchUrl?.url) await handlePaypalAppUrlOpen(launchUrl)
})

onBeforeUnmount(() => {
    showCardModal.value = false
    showOtpModal.value = false
    hidePaypalWaitDialog()
    paypalUrlListener?.remove()
})
</script>

<template>
    <div class="payment-pages">
        <div class="payment-wrappers">
            <q-card flat borderd class="payment-cards">
                <div class="card-title fredoka text-center">
                    Make Payment
                </div>

                <div class="card-subtitle text-center">
                    {{ currentSubtitle }}
                </div>

                <!-- METHOD TABS -->
                <q-tabs v-model="selectedMethod" class="method-tabs q-mb-lg"
                    :align="$q.screen.lt.md ? 'left' : 'center'" active-color="primary" indicator-color="primary"
                    outside-arrows mobile-arrows :dense="$q.screen.lt.md">
                    <q-tab v-for="option in methodOptions" :key="option.value" :name="option.value" :icon="option.icon"
                        :label="option.label" no-caps />
                </q-tabs>

                <!-- AMOUNT SUMMARY (shared, not editable) -->
                <div class="feature-card amount-summary q-mb-md">
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

                <!-- CARD -->
                <q-form v-if="selectedMethod === 'card'" class="form-section" @submit.prevent="payWithCard">

                    <q-input v-model="msisdn" label="Cellphone" dark dense bg-color="transparent">
                        <template #prepend>
                            <q-icon name="phone_android" />
                        </template>
                    </q-input>

                    <q-input v-model="cardEmail" label="Email" type="email" dark dense>
                        <template #prepend>
                            <q-icon name="email" />
                        </template>
                    </q-input>

                    <div v-if="statusMessage" class="status-box">
                        {{ statusMessage }}
                    </div>

                    <div class="btn-wrap">
                        <q-btn type="submit" :label="buttonLabel" unelevated no-caps :loading="loading"
                            class="pay-btn" />
                    </div>

                </q-form>

                <!-- MOBILE MONEY (OTP) -->
                <div v-else-if="selectedMethod === 'mobile'" class="form-section">
                    <q-input v-model="msisdn" label="Phone Number" dense dark lazy-rules :rules="[
                        val => !!val || 'Phone required'
                    ]">
                        <template #prepend>
                            <q-icon name="phone_android" />
                        </template>
                    </q-input>

                    <div v-if="statusMessage" class="status-box">
                        {{ statusMessage }}
                    </div>

                    <div class="btn-wrap">
                        <q-btn label="Continue" class="pay-btn" :loading="loading" unelevated no-caps
                            @click="payWithMobile" />
                    </div>

                </div>

                <!-- M-PESA -->
                <q-form v-else-if="selectedMethod === 'mpesa'" class="form-section" @submit.prevent="payWithMpesa">

                    <q-input v-model="msisdn" label="M-Pesa Number" dense dark maxlength="8" hint="Example: 58123456">
                        <template #prepend>
                            <q-icon name="phone_android" />
                        </template>
                    </q-input>

                    <div v-if="statusMessage" class="status-box">
                        {{ statusMessage }}
                    </div>

                    <div v-if="mpesaPollUi.conversationId" class="mpesa-poll-meta q-mb-sm">
                        <q-chip dense color="primary" text-color="white" icon="hourglass_top" size="sm">
                            {{ mpesaPollUi.status || 'pending' }}
                        </q-chip>
                        <q-chip dense color="secondary" text-color="white" icon="repeat" size="sm">
                            Attempt {{ mpesaPollUi.attempt }}<span v-if="mpesaPollUi.maxAttempts">/{{
                                mpesaPollUi.maxAttempts }}</span>
                        </q-chip>
                        <q-chip v-if="mpesaPollUi.checkedAt" dense color="grey-8" text-color="white" icon="schedule"
                            size="sm">
                            {{ mpesaPollUi.checkedAt }}
                        </q-chip>
                        <q-chip v-if="mpesaPollUi.source" dense color="grey-7" text-color="white" icon="dns" size="sm">
                            {{ mpesaPollUi.source }}
                        </q-chip>
                        <q-chip v-if="mpesaPollUi.queryReference" dense color="grey-9" text-color="white" icon="tag"
                            size="sm" class="ellipsis-chip">
                            {{ mpesaPollUi.queryReference }}
                        </q-chip>
                    </div>

                    <div class="btn-wrap">
                        <q-btn type="submit" unelevated no-caps :loading="loading" class="pay-btn">
                            <q-icon name="payments" class="q-mr-sm" />
                            {{ buttonLabel }}
                        </q-btn>
                    </div>

                </q-form>

                <!-- PAYPAL -->
                <div v-else-if="selectedMethod === 'paypal'" class="form-section">

                    <div v-if="statusMessage" class="status-box">
                        {{ statusMessage }}
                    </div>

                    <div class="btn-wrap">
                        <q-btn unelevated no-caps :loading="loading" class="pay-btn" @click="payWithPaypal">
                            <q-icon name="account_balance_wallet" class="q-mr-sm" />
                            Pay with PayPal
                        </q-btn>
                    </div>

                </div>

            </q-card>

        </div>

        <!-- CARD MODAL -->
        <q-dialog v-model="showCardModal" maximized>
            <q-card class="column full-height">

                <q-bar>
                    <div class="text-weight-bold">Complete Payment</div>
                    <q-space />
                    <q-btn flat round dense icon="close" @click="closeCardModal" />
                </q-bar>

                <q-card-section class="col q-pa-none flex">
                    <iframe v-if="cardIframeSrc" :src="cardIframeSrc" class="payment-iframe" />
                </q-card-section>

            </q-card>
        </q-dialog>

        <!-- OTP CONFIRM MODAL -->
        <q-dialog v-model="showOtpModal" persistent>
            <q-card class="q-pa-md" style="min-width: 320px; max-width: 420px; width: 100%;">
                <div class="text-h6 text-weight-bold q-mb-xs">Confirm OTP</div>
                <div class="text-caption q-mb-md">
                    Enter the OTP sent to {{ msisdn }}
                </div>

                <q-input v-model="otp" label="Enter OTP" outlined dense maxlength="6" autofocus>
                    <template #prepend>
                        <q-icon name="security" />
                    </template>
                </q-input>

                <div v-if="statusMessage" class="status-box q-mt-md">
                    {{ statusMessage }}
                </div>

                <div class="row justify-end q-gutter-sm q-mt-lg">
                    <q-btn flat no-caps label="Cancel" @click="closeOtpModal" :disable="loading" />
                    <q-btn color="primary" unelevated no-caps label="Confirm Payment" :loading="loading"
                        @click="confirmMobileOtp" />
                </div>
            </q-card>
        </q-dialog>

    </div>
</template>

<style scoped>
.card-subtitle {
    margin: 0 auto 16px;
    max-width: 420px;
}

.method-tabs {
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 12px;
    padding: 6px;
}

.amount-summary {
    justify-content: center;
    text-align: center;
}

.form-section {
    max-width: 460px;
    margin: 0 auto;
}

.form-section :deep(.q-field) {
    margin-bottom: 10px;
}

.btn-wrap {
    display: flex;
    justify-content: center;
}

.btn-wrap .pay-btn {
    width: 100%;
    max-width: 360px;
}

.mpesa-poll-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
}

.ellipsis-chip {
    max-width: 100%;
}

.ellipsis-chip :deep(.q-chip__content) {
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.method-tabs :deep(.q-tab) {
    min-height: 44px;
}

.method-tabs :deep(.q-tab__label) {
    font-size: 13px;
}

@media (min-width: 1024px) {
    /* .payment-wrapper {
        max-width: 860px;
    } */

    .method-tabs :deep(.q-tab) {
        min-width: 0;
        flex: 1 1 0;
    }

    .payment-card {
        padding: 28px;
    }
}

@media (max-width: 600px) {
    /* .payment-wrapper {
        padding: 8px;
    }

    .payment-card {
        border-radius: 4px;
        padding: 12px;
    } */

    .method-tabs {
        overflow-x: auto;
        padding: 4px;
    }

    .method-tabs :deep(.q-tab) {
        min-width: 110px;
    }

    .card-title {
        font-size: 1.25rem;
    }
}
</style>
