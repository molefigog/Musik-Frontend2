<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { ApiService } from 'src/services/api'
// import axios from 'axios'
import { useAuthStore } from 'stores/auth'


const auth = useAuthStore()
const $q = useQuasar()
const msisdn = ref('')
const amount = ref('')
const email = ref('')
const loading = ref(false)
const statusMessage = ref('')
const iframeSrc = ref(null)
// modal
const showModal = ref(false)
const iframeHtml = ref(null)
const redirectUrl = ref(null)


const pay = async () => {
  loading.value = true
  statusMessage.value = ''

  try {
    const res = await ApiService.post(
      'v1/cpay/card',
      {
        msisdn: msisdn.value,
        amount: amount.value,
        email: email.value
      },
      {
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      }
    )

    const responseData = res.data
    showModal.value = true

    iframeHtml.value = null
    redirectUrl.value = null
    iframeSrc.value = null

    if (responseData.type === 'html') {
      // extract iframe src from HTML
      const match = responseData.html.match(/src="([^"]+)"/)
      iframeSrc.value = match ? match[1] : null
    } else if (responseData.redirect_url) {
      iframeSrc.value = responseData.redirect_url
    }

    statusMessage.value = 'Payment initialized'

    $q.notify({
      type: 'positive',
      message: 'Payment initialized'
    })

  } catch (error) {
    console.log(error)
    statusMessage.value = 'Payment failed'

    $q.notify({
      type: 'negative',
      message: error?.response?.data?.message || 'Payment failed'
    })

  } finally {
    loading.value = false
  }
}

const closeModal = () => {
  showModal.value = false
  iframeHtml.value = null
  redirectUrl.value = null
}
</script>

<template>
  <q-page class="payment-page">

    <div class="payment-wrapper">

      <!-- LEFT -->
      <div class="payment-info">

        <div class="hero-badge">
          C-Pay Card Gateway
        </div>

        <div class="hero-title fredoka">
          Fast & Secure <br />
          Card Payments
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

      <!-- RIGHT -->
      <q-card flat class="payment-card">

        <div class="card-title fredoka">
          Make Payment
        </div>

        <div class="card-subtitle">
          Fill in payment details below
        </div>

        <q-form class="form-section" @submit.prevent="pay">

          <!-- PHONE -->
          <q-input v-model="msisdn" label="Cellphone" outlined dark rounded bg-color="transparent">
            <template #prepend>
              <q-icon name="phone_android" />
            </template>
          </q-input>

          <!-- AMOUNT -->
          <q-input v-model="amount" label="Amount" type="number" outlined dark rounded>
            <template #prepend>
              <q-icon name="payments" />
            </template>
          </q-input>

          <!-- EMAIL -->
          <q-input v-model="email" label="Email" type="email" outlined dark rounded>
            <template #prepend>
              <q-icon name="email" />
            </template>
          </q-input>

          <!-- STATUS -->
          <div v-if="statusMessage" class="status-box">
            {{ statusMessage }}
          </div>

          <!-- BUTTON -->
          <div class="btn-wrap">
            <q-btn type="submit" label="Pay Now" unelevated no-caps :loading="loading" class="pay-btn" />
          </div>

        </q-form>

      </q-card>

    </div>

    <q-dialog v-model="showModal" maximized>
      <q-card class="column full-height">

        <q-bar>
          <div class="text-weight-bold">Complete Payment</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="closeModal" />
        </q-bar>

        <q-card-section class="col q-pa-none flex">
          <iframe v-if="iframeSrc" :src="iframeSrc" class="payment-iframe" />
        </q-card-section>

      </q-card>
    </q-dialog>
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
