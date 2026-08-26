<template>
  <q-page class="payment-page">
    <div class="payment-wrapper">

      <!-- LEFT -->
      <div class="payment-info">
        <div class="hero-badge">
          PayPal Secure
        </div>
        <div class="hero-title fredoka">
          Fast & Secure
          PayPal Payments
        </div>
        <div class="features">
          <div class="feature-card">
            <q-icon name="verified_user" size="26px" />
            <div>
              <div class="feature-title">
                Encrypted
              </div>
              <div class="feature-text">
                Secure payment processing
              </div>
            </div>
          </div>

          <div class="feature-card">
            <q-icon name="flash_on" size="26px" />
            <div>
              <div class="feature-title">
                Instant
              </div>
              <div class="feature-text">
                Real-time transactions
              </div>
            </div>
          </div>
        </div>
      </div>

      <q-card flat class="payment-card">
        <!-- HEADER -->
        <div class="hero-badge">
          PayPal Payment
        </div>
        <div class="card-title fredoka">
          Secure Checkout
        </div>
        <div class="card-subtitle">
          Complete your payment using PayPal
        </div>
        <!-- FORM -->
        <q-form class="form-section" @submit="initiatePayment">
          <!-- AMOUNT -->
          <q-input v-model="amount" type="number" label="Amount (USD)" outlined rounded dark lazy-rules :rules="[
            val => !!val || 'Amount is required',
            val => val > 0 || 'Must be greater than 0'
          ]" />
          <!-- BUTTON -->
          <div class="btn-wrap">
            <q-btn type="submit" class="pay-btn" :loading="loading" unelevated no-caps label="Pay with PayPal" />
          </div>
        </q-form>
      </q-card>

      <!-- DIALOG -->
      <!-- <q-dialog v-model="dialog">
        <q-card class="dialog-card">
          <q-bar class="dialog-bar">
            <div class="text-weight-bold">
              PayPal Payment
            </div>
            <q-space />

            <q-btn icon="close" flat round dense v-close-popup />
          </q-bar>

          <q-card-section class="dialog-body">
            <div v-if="step === 'redirect'">
              <div class="status-box q-mb-md">
                You will be redirected to PayPal to complete payment.
              </div>
              <q-btn color="green" icon="launch" label="Continue to PayPal" class="pay-btn full-width"
                @click="goToPayPal" unelevated no-caps />

            </div>
            <div v-else-if="step === 'result'">
              <pre class="status-box">{{ response }}</pre>
            </div>
          </q-card-section>
        </q-card>
      </q-dialog> -->

      <q-dialog v-model="dialog">
        <q-card class="dialog-card">
          <q-toolbar>
            <q-avatar>
              <img src="https://cdn.quasar.dev/logo-v2/svg/logo.svg" />
            </q-avatar>

            <q-toolbar-title><span class="text-weight-bold">Quasar</span>
              Framework</q-toolbar-title>

            <q-btn flat round dense icon="close" v-close-popup />
          </q-toolbar>

          <q-card-section>
            <div v-if="step === 'redirect'">
              <div class="status-box q-mb-md">
                You will be redirected to PayPal to complete payment.
              </div>
              <q-btn color="green" icon="launch" label="Continue to PayPal" class="pay-btn full-width"
                @click="goToPayPal" unelevated no-caps />

            </div>
            <div v-else-if="step === 'result'">
              <pre class="status-box">{{ response }}</pre>
            </div>
          </q-card-section>
        </q-card>
      </q-dialog>



    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { ApiService } from 'src/services/api'

const $q = useQuasar()
const api = ApiService
const amount = ref(10)
const loading = ref(false)
const dialog = ref(false)
const step = ref('redirect') // redirect | result
const approvalUrl = ref('')
const response = ref('')
const orderId = ref('')
const txnId = ref('')

const initiatePayment = async () => {
  try {
    loading.value = true

    const res = await api.post('paypal/pay', {
      amount: amount.value
    })

    approvalUrl.value = res.data.approval_url
    orderId.value = res.data.order_id
    txnId.value = res.data.txn_id

    step.value = 'redirect'
    dialog.value = true

  } catch (err) {

    $q.dialog({
      title: 'Error',
      message: err?.response?.data?.message || err.message
    })

  } finally {
    loading.value = false
  }
}

const goToPayPal = () => {
  window.location.href = approvalUrl.value
}
</script>

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
