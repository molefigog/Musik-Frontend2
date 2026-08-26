<template>
  <q-page class="payment-page">

    <div class="payment-wrapper">

      <!-- LEFT -->
      <div class="payment-info">

        <div class="hero-badge">
          Mpesa Gateway
        </div>

        <div class="hero-title fredoka">
          Fast & Secure <br />
          Mobile Payments
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

          <div class="feature-card">
            <q-icon name="smartphone" size="26px" />
            <div>
              <div class="feature-title">
                Mobile Ready
              </div>
              <div class="feature-text">
                Optimized for all devices
              </div>
            </div>
          </div>

        </div>

      </div>


      <q-card flat class="payment-card">

        <!-- TOP -->
        <div class="hero-badge">
          {{ title }}
        </div>

        <div class="card-title fredoka">
          M-Pesa Payment
        </div>

        <div class="card-subtitle">
          Secure mobile payment experience
        </div>

        <!-- FORM -->
        <q-form class="form-section" @submit="submitForm">

          <!-- PHONE -->
          <!-- <q-input v-model="form.input_CustomerMSISDN" label="M-Pesa Number" outlined rounded dark maxlength="8"
            lazy-rules hint="Example: 58123456" :rules="[
              val => !!val || 'MSISDN is required',
              val => /^5\\d{7}$/.test(val) || 'Must start with 5 and be 8 digits'
            ]"> -->

          <q-input v-model="form.input_CustomerMSISDN" label="M-Pesa Number" outlined rounded dark maxlength="8"
            lazy-rules hint="Example: 58123456">
            <template #prepend>
              <q-icon name="phone_android" />
            </template>
          </q-input>

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

          <!-- BUTTON -->
          <div class="btn-wrap">

            <q-btn type="submit" unelevated no-caps :loading="loading" class="pay-btn">

              <q-icon name="payments" class="q-mr-sm" />

              {{ buttonLabel }}

            </q-btn>

          </div>

        </q-form>

      </q-card>

    </div>
  </q-page>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { ApiService } from 'src/services/api'

const $q = useQuasar()

const props = defineProps({
  title: {
    type: String,
    default: 'M-Pesa Payment'
  },

  buttonLabel: {
    type: String,
    default: 'Pay Now'
  },

  endpoint: {
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

  descriptionField: {
    type: String,
    default: 'input_PurchasedItemsDesc'
  },

  musicId: {
    type: [String, Number],
    required: true
  },

  icon: {
    type: String,
    default: 'payments'
  },

  chipColor: {
    type: String,
    default: 'positive'
  },

  method: {
    type: String,
    default: 'post' // or 'get'
  },
})

const loading = ref(false)

const form = reactive({
  input_Amount: props.amount,
  input_CustomerMSISDN: '',
  [props.descriptionField]: props.description,
  input_MusicId: props.musicId
})

const submitForm = async () => {

  try {

    loading.value = true
    const formData = new FormData()
    Object.keys(form).forEach((key) => {
      formData.append(key, form[key])
    })

    // INITIAL LOADING
    const dialog = $q.dialog({
      title: 'M-Pesa Payment',
      message: `
        <div class="text-center q-pa-md">
          <div class="text-h6">
            Waiting for customer confirmation...
          </div>

          <div class="q-mt-md">
            Please check your phone and enter your M-Pesa PIN.
          </div>
        </div>
      `,
      html: true,
      persistent: true,
      ok: false
    })

    let response

    if (props.method.toLowerCase() === 'get') {
      response = await ApiService.get(props.endpoint, {
        params: form
      })
    } else {
      const formData = new FormData()
      Object.keys(form).forEach((key) => {
        formData.append(key, form[key])
      })

      response = await ApiService.post(
        props.endpoint,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        }
      )
    }

    dialog.hide()

    const charge = response.data?.charge
    const query = response.data?.query
    // SUCCESS
    if (
      charge?.output_ResponseCode === 'INS-0' &&
      query?.output_ResponseTransactionStatus === 'Completed'
    ) {

      $q.dialog({
        title: 'Payment Successful',
        message: `
          <div class="q-pa-sm">

            <div class="text-positive text-h6 text-weight-bold">
              Payment Completed Successfully
            </div>

            <div class="q-mt-md">
              <strong>Transaction ID:</strong><br>
              ${query.output_OriginalTransactionID}
            </div>

            <div class="q-mt-md">
              <strong>Status:</strong><br>
              ${query.output_ResponseTransactionStatus}
            </div>

            <div class="q-mt-md">
              <strong>Conversation ID:</strong><br>
              ${query.output_ThirdPartyConversationID}
            </div>

          </div>
        `,
        html: true
      })

    } else {

      // FAILED
      $q.dialog({
        title: 'Payment Failed',
        message: `
          <div class="q-pa-sm">

            <div class="text-negative text-h6 text-weight-bold">
              Transaction Failed
            </div>

            <div class="q-mt-md">
              ${query?.output_ResponseDesc || 'Unknown error occurred'}
            </div>

          </div>
        `,
        html: true
      })
    }

  } catch (error) {

    console.error(error)

    $q.dialog({
      title: 'Server Error',
      message: `
        <div class="q-pa-sm">

          <div class="text-negative text-h6 text-weight-bold">
            Request Failed
          </div>

          <div class="q-mt-md">
            ${error?.response?.data?.message ||
        error.message ||
        'Unable to process payment'
        }
          </div>

        </div>
      `,
      html: true
    })

  } finally {

    loading.value = false

  }
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
    font-size: 26px;
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
