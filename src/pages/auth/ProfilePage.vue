<template>
  <q-page class="q-pa-md">
    <div class="row items-start q-col-gutter-lg">
      <!-- SIDEBAR -->
      <div class="col-12 col-md-3">
        <div v-if="$q.screen.gt.sm" class="q-mb-lg">
          <div class="text-h6">Account Settings</div>
        </div>

        <q-tabs v-model="tab" :vertical="$q.screen.gt.sm" :inline-label="!$q.screen.gt.sm" active-color="primary"
          indicator-color="primary">
          <q-tab name="profile" icon="person" :label="$q.screen.gt.sm ? 'Profile' : ''" />
          <q-tab name="password" icon="lock" :label="$q.screen.gt.sm ? 'Password' : ''" />
          <q-tab name="sessions" icon="devices" :label="$q.screen.gt.sm ? 'Sessions' : ''" />
          <q-tab name="Transactions" icon="history" :label="$q.screen.gt.sm ? 'Transactions' : ''" />
        </q-tabs>
      </div>

      <!-- CONTENT -->
      <div class="col-12 col-md-9">
        <q-tab-panels v-model="tab" animated>
          <!-- PROFILE TAB -->
          <q-tab-panel name="profile">
            <div v-if="auth.user" class="q-gutter-lg">
              <div class="text-h6">Profile Information</div>
              <q-input filled outlined v-model="form.name" label="Name" />
              <q-input filled outlined v-model="form.email" label="Email" />
              <q-input filled outlined v-model="form.tel" label="Tel" />
              <q-btn label="Update Profile" color="primary" :loading="loading" @click="update" unelevated />
            </div>
          </q-tab-panel>

          <!-- PASSWORD TAB -->
          <q-tab-panel name="password">
            <div class="q-gutter-lg">
              <div class="text-h6">Update Password</div>
              <q-input filled outlined v-model="form.current_password" label="Current Password"
                :type="isPwd1 ? 'password' : 'text'">
                <template v-slot:append>
                  <q-icon :name="isPwd1 ? 'visibility_off' : 'visibility'" class="cursor-pointer"
                    @click="isPwd1 = !isPwd1" />
                </template>
              </q-input>
              <q-input filled outlined v-model="form.new_password" label="New Password"
                :type="isPwd2 ? 'password' : 'text'">
                <template v-slot:append>
                  <q-icon :name="isPwd2 ? 'visibility_off' : 'visibility'" class="cursor-pointer"
                    @click="isPwd2 = !isPwd2" />
                </template>
              </q-input>
              <q-input filled outlined v-model="form.new_password_confirmation" label="Confirm New Password"
                :type="isPwd3 ? 'password' : 'text'">
                <template v-slot:append>
                  <q-icon :name="isPwd3 ? 'visibility_off' : 'visibility'" class="cursor-pointer"
                    @click="isPwd3 = !isPwd3" />
                </template>
              </q-input>
              <q-btn label="Update Password" color="primary" :loading="loading" @click="update" unelevated />
            </div>
          </q-tab-panel>
          <!-- SESSIONS TAB -->
          <q-tab-panel name="sessions">
            <div class="row items-center justify-between q-mb-md">
              <div class="text-h6">Active Sessions</div>
              <q-btn outline color="negative" icon="logout" label="Logout Other Sessions" @click="logoutOthers" />
            </div>
            <q-list bordered separator class="rounded-borders">
              <q-item v-for="session in sessions" :key="session.id">
                <q-item-section avatar>
                  <q-avatar color="primary" text-color="white" icon="devices" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ session.browser }} on {{ session.platform }}</q-item-label>
                  <q-item-label caption>{{ session.ip_address }}</q-item-label>
                  <q-item-label caption>Last active {{ session.last_active }}</q-item-label>
                  <q-badge v-if="session.is_current" color="positive" label="Current Device" class="q-mt-xs" />
                </q-item-section>
                <q-item-section side>
                  <q-btn v-if="!session.is_current" flat round dense color="negative" icon="logout"
                    @click="removeSession(session.id)" />
                </q-item-section>
              </q-item>
            </q-list>
          </q-tab-panel>

          <q-tab-panel name="Transactions">
            <div class="text-h6 q-mb-md">Transaction History</div>
            <TransactionLog :payments="auth.user?.payments || []" />
          </q-tab-panel>
        </q-tab-panels>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from 'stores/auth'
import { useQuasar } from 'quasar'
import { ApiService } from 'src/services/api'
import TransactionLog from 'src/components/TransactionLog.vue'

const tab = ref(localStorage.getItem('profileTab') || 'profile')
const auth = useAuthStore()
const $q = useQuasar()
const api = ApiService

const loading = ref(false)

const isPwd1 = ref(true)
const isPwd2 = ref(true)
const isPwd3 = ref(true)

const sessions = ref([])
let paymentPoll

watch(tab, (val) => {
  localStorage.setItem('profileTab', val)
})

const form = ref({
  name: '',
  email: '',
  tel: '',
  current_password: '',
  new_password: '',
  new_password_confirmation: ''
})

watch(
  () => auth.user,
  (user) => {
    if (user) {
      form.value.name = user.name || ''
      form.value.email = user.email || ''
      form.value.tel = user.tel || ''
    }
  },
  { immediate: true }
)

const fetchSessions = async () => {
  try {
    const { data } = await api.get('/user/sessions')
    sessions.value = data
  } catch (err) {
    console.error(err)
    $q.notify({
      type: 'negative',
      message: 'Failed to load sessions'
    })
  }
}

const removeSession = async (id) => {
  try {

    await api.delete(`/user/sessions/${id}`)
    $q.notify({
      type: 'positive',
      message: 'Session removed'
    })
    fetchSessions()
  } catch (err) {

    $q.notify({
      type: 'negative',
      message: err?.response?.data?.message || 'Failed to remove session'
    })
  }
}

const logoutOthers = async () => {
  try {
    await api.delete('/user/sessions')
    $q.notify({
      type: 'positive',
      message: 'Other sessions logged out'
    })
    fetchSessions()
  } catch (err) {

    $q.notify({
      type: 'negative',
      message: err?.response?.data?.message || 'Failed to logout sessions'
    })
  }
}

onMounted(async () => {

  if (!auth.user && auth.token) {
    await auth.fetchUser()
  }

  await fetchSessions()

  paymentPoll = window.setInterval(() => {
    if (auth.token) {
      auth.fetchUser({ silent: true })
    }
  }, 30000)
})

onUnmounted(() => {
  window.clearInterval(paymentPoll)
})

const update = async () => {
  try {

    loading.value = true

    if (
      form.value.new_password !==
      form.value.new_password_confirmation
    ) {
      $q.notify({
        type: 'negative',
        message: 'Passwords do not match'
      })

      return
    }

    const payload = {
      name: form.value.name,
      email: form.value.email,
      tel: form.value.tel,
      current_password: form.value.current_password,
      password: form.value.new_password,
      password_confirmation:
        form.value.new_password_confirmation,
    }

    await auth.updateProfile(payload)

    $q.notify({
      type: 'positive',
      message: 'Profile updated successfully'
    })

    form.value.current_password = ''
    form.value.new_password = ''
    form.value.new_password_confirmation = ''

  } catch (err) {

    $q.notify({
      type: 'negative',
      message:
        err?.response?.data?.message ||
        err.message ||
        'Update failed',
    })

  } finally {

    loading.value = false
  }
}
</script>
<style scoped></style>
