<template>
  <q-page class="auth-page flex flex-center q-pa-md">


    <!-- RIGHT PANEL -->
    <div class="col-12 col-md-7 right-panel">
      <div class="form-container">

        <div class="text-center q-mb-xl">
          <div class="text-h4 text-weight-bold fredoka gradient-text">
            Register
          </div>

          <div class="text-grey-5 q-mt-sm">
            Join Genius Works Ent
          </div>
        </div>

        <q-form class="q-gutter-lg" @submit.prevent="onRegister">

          <q-input v-model="form.name" label="Username" outlined rounded dark lazy-rules :rules="[
            val => !!val || 'Username is required'
          ]" :error="!!fieldErrors.name" :error-message="fieldErrors.name">
            <template #prepend>
              <q-icon name="person" />
            </template>
          </q-input>

          <q-input v-model="form.email" label="Email Address" type="email" outlined rounded dark lazy-rules :rules="[
            val => !!val || 'Email is required'
          ]" :error="!!fieldErrors.email" :error-message="fieldErrors.email">
            <template #prepend>
              <q-icon name="mail" />
            </template>
          </q-input>

          <q-input v-model="form.password" label="Password" :type="showPassword ? 'text' : 'password'" outlined rounded
            dark lazy-rules :rules="[
              val => !!val || 'Password is required',
              val => val.length >= 6 || 'Minimum 6 characters'
            ]" :error="!!fieldErrors.password" :error-message="fieldErrors.password">
            <template #prepend>
              <q-icon name="lock" />
            </template>

            <template #append>
              <q-icon :name="showPassword ? 'visibility_off' : 'visibility'" class="cursor-pointer"
                @click="showPassword = !showPassword" />
            </template>
          </q-input>

          <q-input v-model="form.password_confirmation" label="Confirm Password"
            :type="showConfirmPassword ? 'text' : 'password'" outlined rounded dark lazy-rules :rules="[
              val => !!val || 'Confirm password',
              val => val === form.password || 'Passwords do not match'
            ]" :error="!!fieldErrors.password_confirmation" :error-message="fieldErrors.password_confirmation">
            <template #prepend>
              <q-icon name="verified_user" />
            </template>

            <template #append>
              <q-icon :name="showConfirmPassword ? 'visibility_off' : 'visibility'" class="cursor-pointer"
                @click="showConfirmPassword = !showConfirmPassword" />
            </template>
          </q-input>
          <div v-if="fieldErrors.general" class="glass-error text-white q-pa-md">
            {{ fieldErrors.general }}
          </div>
          <q-btn type="submit" label="Create Account" class="full-width register-btn" unelevated rounded
            :loading="loading" />

          <div class="text-center q-mt-lg text-grey-5">
            Already have an account?

            <router-link to="/login" class="text-primary text-weight-bold" style="text-decoration: none">
              Login
            </router-link>
          </div>

        </q-form>
      </div>
    </div>

  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/auth'

const router = useRouter()
const $q = useQuasar()
const auth = useAuthStore()

const loading = ref(false)

const showPassword = ref(false)
const showConfirmPassword = ref(false)

const form = ref({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
})

const fieldErrors = ref({
  name: null,
  email: null,
  password: null,
  password_confirmation: null,
  general: null
})

const clearErrors = () => {
  fieldErrors.value = {
    name: null,
    email: null,
    password: null,
    password_confirmation: null,
    general: null
  }
}

const firstError = (errors, field) => {
  const message = errors?.[field]
  return Array.isArray(message) ? message[0] : message || null
}

const onRegister = async () => {
  loading.value = true
  clearErrors()

  try {
    await auth.register(form.value)

    $q.notify({
      type: 'positive',
      message: 'Registration successful'
    })

    router.push('/')

  } catch (error) {
    if (error?.response?.status === 422) {
      const errors = error.response.data.errors || {}

      fieldErrors.value = {
        name: firstError(errors, 'name'),
        email: firstError(errors, 'email'),
        password: firstError(errors, 'password'),
        password_confirmation: firstError(errors, 'password_confirmation'),
        general: null
      }
    } else {
      fieldErrors.value.general =
        error?.response?.data?.message || error?.message || 'Registration failed'
    }

    $q.notify({
      type: 'negative',
      message: fieldErrors.value.general || 'Please correct the highlighted fields'
    })

  } finally {
    loading.value = false
  }
}
</script>
