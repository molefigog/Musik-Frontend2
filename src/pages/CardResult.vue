<template>
  <div class="result-page">
    <q-dialog v-model="dialog" persistent>
      <q-card class="result-card">
        <q-card-section class="text-h6">
          Card Payment Result
        </q-card-section>

        <q-card-section>
          <q-chip :color="isSuccess ? 'green' : 'red'" text-color="white" class="q-mb-md">
            {{ status }}
          </q-chip>

          <div v-if="isSuccess" class="text-green text-weight-medium">
            ✅ Payment Successful
          </div>

          <div v-else class="text-red text-weight-medium">
            ❌ Payment Failed
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

const route = useRoute()
const router = useRouter()
const dialog = ref(false)
const status = ref((route.query.status || 'failed').toLowerCase())
const txn = ref(route.query.txn || 'unknown')
const isSuccess = computed(() => {
  return ['completed', 'approved', 'success'].includes(status.value)
})
const goHome = () => {
  dialog.value = false
  router.push('/')
}
onMounted(() => {
  dialog.value = true
  if (isSuccess.value) {
    setTimeout(() => {
      goHome()
    }, 3000)
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
