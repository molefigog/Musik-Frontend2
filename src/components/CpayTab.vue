<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { ApiService } from 'src/services/api'

const $q = useQuasar()

const msisdn = ref('')
const amount = ref('')
const otp = ref('')

const transactionId = ref(null)
const step = ref(1)
const message = ref('')

const loadingPay = ref(false)
const loadingConfirm = ref(false)

const notify = (type, message) => {
    $q.notify({
        type,
        message,
        position: 'top',
    })
}

/**
 * STEP 1
 */
const makePayment = async () => {
    loadingPay.value = true
    message.value = ''

    try {
        const res = await ApiService.post('v1/cpay/pay', {
            msisdn: msisdn.value,
            amount: amount.value,
        })

        const data = res.data

        if (data.success && data.status === 'otpSent') {
            transactionId.value = data.transaction_id

            step.value = 2

            notify('info', data.message)

            message.value = data.message

        } else {
            notify(
                'warning',
                data.message || 'Payment failed'
            )

            message.value =
                data.message || 'Payment failed'
        }

    } catch (error) {
        console.log(error)

        message.value = 'Error sending payment'

        notify('negative', message.value)

    } finally {
        loadingPay.value = false
    }
}

/**
 * STEP 2
 */
const confirmPayment = async () => {
    loadingConfirm.value = true
    message.value = ''

    try {
        const res = await ApiService.post(
            'v1/cpay/confirm',
            {
                transaction_id: transactionId.value,
                msisdn: msisdn.value,
                amount: Number(amount.value),
                otp: otp.value,
            }
        )

        const data = res.data

        if (data.success) {

            notify(
                'positive',
                'Payment successful!'
            )

            message.value =
                '✅ Payment successful!'

            step.value = 1

            otp.value = ''
            transactionId.value = null

            amount.value = ''

        } else {

            notify(
                'negative',
                data.message || 'Payment failed'
            )

            message.value =
                data.message || '❌ Payment failed'
        }

    } catch (error) {
        console.log(error)

        message.value =
            'Error confirming payment'

        notify('negative', message.value)

    } finally {
        loadingConfirm.value = false
    }
}
</script>

<template>
    <q-page class="payment-page">

        <div class="payment-wrapper">

            <!-- LEFT -->
            <div class="payment-info">

                <div class="hero-badge">
                    CPay Secure
                </div>

                <div class="hero-title fredoka">
                    OTP Verified <br />
                    Mobile Payments
                </div>

                <div class="hero-subtitle">
                    Secure mobile money transactions with real-time OTP verification.
                </div>

                <div class="features">

                    <!-- STEP -->
                    <div class="feature-card">

                        <div class="step-number">
                            1
                        </div>

                        <div>
                            <div class="feature-title">
                                Enter Payment
                            </div>

                            <div class="feature-text">
                                Add phone number and amount
                            </div>
                        </div>

                    </div>

                    <!-- STEP -->
                    <div class="feature-card">

                        <div class="step-number">
                            2
                        </div>

                        <div>
                            <div class="feature-title">
                                Verify OTP
                            </div>

                            <div class="feature-text">
                                Confirm securely on your device
                            </div>
                        </div>

                    </div>

                </div>

            </div>

            <!-- RIGHT -->
            <q-card flat class="payment-card">

                <div class="card-title fredoka">
                    {{
                        step === 1
                            ? 'Start Payment'
                            : 'Verify OTP'
                    }}
                </div>

                <div class="card-subtitle">
                    {{
                        step === 1
                            ? 'Secure mobile transaction'
                            : 'Enter the OTP sent to your phone'
                    }}
                </div>

                <!-- MESSAGE -->
                <transition appear enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
                    <div v-if="message" class="status-box q-mb-lg">
                        {{ message }}
                    </div>
                </transition>

                <!-- STEP 1 -->
                <div v-if="step === 1" class="form-section">

                    <!-- PHONE -->
                    <q-input v-model="msisdn" label="Phone Number" outlined rounded dark lazy-rules :rules="[
                        val => !!val || 'Phone required'
                    ]">
                        <template #prepend>
                            <q-icon name="phone_android" />
                        </template>
                    </q-input>

                    <!-- AMOUNT -->
                    <q-input v-model="amount" type="number" label="Amount" outlined rounded dark lazy-rules :rules="[
                        val => !!val || 'Amount required'
                    ]">
                        <template #prepend>
                            <q-icon name="payments" />
                        </template>
                    </q-input>

                    <!-- BUTTON -->
                    <div class="btn-wrap">
                        <q-btn label="Continue" class="pay-btn" :loading="loadingPay" unelevated no-caps
                            @click="makePayment" />
                    </div>

                </div>

                <!-- STEP 2 -->
                <div v-else class="form-section">

                    <div class="otp-note">
                        OTP sent successfully
                    </div>

                    <!-- OTP -->
                    <q-input v-model="otp" label="Enter OTP" outlined rounded dark maxlength="6">
                        <template #prepend>
                            <q-icon name="security" />
                        </template>
                    </q-input>

                    <!-- BUTTON -->
                    <div class="btn-wrap">
                        <q-btn label="Confirm Payment" class="pay-btn" :loading="loadingConfirm" unelevated no-caps
                            @click="confirmPayment" />
                    </div>

                    <!-- BACK -->
                    <q-btn flat no-caps class="back-btn" label="Back" @click="step = 1" />

                </div>

            </q-card>

        </div>

    </q-page>
</template>
<style scoped>
.payment-page {
    min-height: 100vh;
    padding: 40px 24px;

    background:
        radial-gradient(circle at top left, #16213e, transparent 40%),
        radial-gradient(circle at bottom right, #3b1d78, transparent 40%),
        #0b1020;

    display: flex;
    align-items: center;
    justify-content: center;
}

.payment-wrapper {
    width: 100%;
    max-width: 1250px;

    display: grid;
    grid-template-columns: 1fr 480px;
    gap: 60px;
    align-items: center;
}

.hero-badge {
    width: fit-content;
    padding: 10px 18px;
    border-radius: 999px;
    background: rgba(255, 255, 255, .08);
    color: #8ec5ff;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid rgba(255, 255, 255, .08);
}

.hero-title {
    margin-top: 24px;
    font-size: 34px;
    line-height: 1.05;
    font-weight: 700;
    color: white;
}

.hero-subtitle {
    margin-top: 22px;

    max-width: 520px;

    color: rgba(255, 255, 255, .7);

    font-size: 18px;
    line-height: 1.7;
}

.features {
    margin-top: 42px;

    display: flex;
    flex-direction: column;
    gap: 18px;
}

.feature-card {
    display: flex;
    align-items: center;
    gap: 18px;

    padding: 18px 20px;

    border-radius: 22px;

    background: rgba(255, 255, 255, .04);

    border: 1px solid rgba(255, 255, 255, .06);

    color: white;

    backdrop-filter: blur(12px);
}

.feature-title {
    font-size: 15px;
    font-weight: 700;
}

.feature-text {
    color: rgba(255, 255, 255, .65);
    font-size: 13px;
}

.payment-card {
    width: 100%;

    padding: 34px;

    border-radius: 30px;

    background: rgba(255, 255, 255, .06);

    border: 1px solid rgba(255, 255, 255, .08);

    backdrop-filter: blur(22px);

    box-shadow:
        0 10px 50px rgba(0, 0, 0, .35);

    overflow: hidden;
}

.card-title {
    color: white;
    font-size: 30px;
    font-weight: 700;
}

.card-subtitle {
    margin-top: 8px;
    margin-bottom: 28px;

    color: rgba(255, 255, 255, .6);
}

.form-section {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.btn-wrap {
    width: 100%;
}

.pay-btn {
    width: 100%;
    height: 56px;

    border-radius: 16px;

    background: linear-gradient(135deg, #00c6ff, #7f5af0);

    font-size: 15px;
    font-weight: 700;
    letter-spacing: .5px;
}

.status-box {
    padding: 14px 16px;

    border-radius: 14px;

    background: rgba(255, 255, 255, .05);

    color: white;
}

.dialog-card {
    background: #0b1020;
}

.dialog-bar {
    background: rgba(255, 255, 255, .04);
    color: white;
}

.dialog-body {
    padding: 0;
    height: calc(100vh - 50px);
}

.payment-iframe {
    width: 100%;
    height: 100%;
    border: none;
}

/* MOBILE */
@media (max-width: 900px) {

    .payment-wrapper {
        grid-template-columns: 1fr;
        gap: 32px;
    }

    .payment-info {
        text-align: center;
    }

    .hero-badge {
        margin: auto;
    }

    .hero-title {
        font-size: 42px;
    }

    .hero-subtitle {
        margin-left: auto;
        margin-right: auto;
    }

}

@media (max-width: 600px) {

    .payment-page {
        padding: 18px;
    }

    .hero-title {
        font-size: 34px;
    }

    .hero-subtitle {
        font-size: 15px;
    }

    .payment-card {
        padding: 20px 16px;
        border-radius: 22px;
    }

    .card-title {
        font-size: 24px;
    }

    .pay-btn {
        height: 50px;
        border-radius: 14px;
        font-size: 14px;
    }

    .feature-card {
        padding: 14px 16px;
    }

}
</style>
