<template>
  <div class="result-page">
    <q-dialog v-model="dialog" persistent>
      <q-card class="result-card">
        <q-card-section class="text-h6">
          PayPal Payment Result
        </q-card-section>
        <q-card-section>
          <q-chip :color="status === 'processing' ? 'orange' : (isSuccess ? 'green' : 'red')">
            {{ status }}
          </q-chip>
          <div v-if="isSuccess" class="text-green text-weight-medium">
            Payment Successful
          </div>
          <div v-else class="text-red text-weight-medium">
            Payment Failed
          </div>
          <div class="q-mt-md text-caption">
            Transaction: <b>{{ txn }}</b>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn label="OK" color="primary" @click="goHome" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiService } from 'src/services/api'
import { useCartStore } from 'src/stores/cart'

const api = ApiService
const route = useRoute()
const router = useRouter()
const cart = useCartStore()
const dialog = ref(false)
const txn = ref(route.query.txn || route.query.token || route.query.order_id || 'unknown')
const status = ref('processing')
const successTarget = ref('/')
const isSuccess = computed(() => {
  return ['completed', 'approved', 'success'].includes(status.value?.toLowerCase())
})

const clearCartOnSuccess = () => {
  const currentType = cart.itemType
  cart.clear()

  successTarget.value = currentType === 'music' ? '/downloads' : '/'

  return currentType
}

const goHome = () => {
  dialog.value = false
  router.push(successTarget.value)
}
onMounted(async () => {
  dialog.value = true

  const directStatus = String(route.query.status || '').toLowerCase()
  const initialTarget = String(route.query.target || '').toLowerCase()
  if (initialTarget === 'downloads') {
    successTarget.value = '/downloads'
  }

  if (directStatus) {
    status.value = directStatus
    if (isSuccess.value) {
      clearCartOnSuccess()
      setTimeout(goHome, 3000)
    }
    return
  }

  try {
    const res = await api.post('/paypal/capture', {
      order_id: txn.value
    })
    status.value = (res.data.status || 'failed').toString().toLowerCase()
  } catch {
    status.value = 'failed'
  }
  if (isSuccess.value) {
    clearCartOnSuccess()
    setTimeout(goHome, 3000)
  }
})
</script>

<style scoped>
.result-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.result-card {
  width: min(100%, 26rem);
  max-width: 100%;
}

.text-green {
  color: #21ba45;
}

.text-red {
  color: #c10015;
}
</style>
