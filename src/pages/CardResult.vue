<template>
  <q-page class="flex flex-center q-pa-md">
    <q-dialog v-model="dialog" persistent>
      <q-card style="min-width: min(100%, 26rem)">
        <q-card-section class="text-h6">
          Card Payment Result
        </q-card-section>

        <q-card-section>
          <q-chip :color="isSuccess ? 'positive' : 'negative'" text-color="white" class="q-mb-md">
            {{ status }}
          </q-chip>

          <div v-if="isSuccess" class="text-positive text-weight-medium">
            ✅ Payment Successful
          </div>

          <div v-else class="text-negative text-weight-medium">
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
  </q-page>
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
