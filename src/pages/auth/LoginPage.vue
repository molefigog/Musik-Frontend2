<template>
    <q-page class="login-page flex flex-center q-pa-md">
        <div class="login-wrapper">
            <q-card flat bordered class="glass-card overflow-hidden">

                <!-- RIGHT SIDE -->
                <div class="col-12 col-md-7">
                    <div class="q-pa-lg q-pa-xl-md">

                        <div class="text-center q-mb-xl">
                            <div class="text-h4 title">
                                Welcome Back
                            </div>

                            <div class="subtitle q-mt-sm">
                                Login to access virtual service
                            </div>
                        </div>

                        <q-form class="q-gutter-md" @submit="onLogin">

                            <q-input v-model="form.email" label="Email" outlined class="glass-input"
                                :rules="[val => !!val || 'Username is required']" :error="!!fieldErrors.email"
                                :error-message="fieldErrors.email">
                                <template v-slot:prepend>
                                    <q-icon name="person" class="glass-icon" />
                                </template>
                            </q-input>

                            <q-input v-model="form.password" label="Password" outlined class="glass-input"
                                :type="isPwd ? 'password' : 'text'" :rules="[val => !!val || 'Password is required']"
                                :error="!!fieldErrors.password" :error-message="fieldErrors.password">
                                <template v-slot:prepend>
                                    <q-icon name="lock" class="glass-icon" />
                                </template>

                                <template v-slot:append>
                                    <q-icon :name="isPwd ? 'visibility_off' : 'visibility'"
                                        class="cursor-pointer glass-icon" @click="isPwd = !isPwd" />
                                </template>
                            </q-input>

                            <div v-if="fieldErrors.general" class="glass-error q-pa-md">
                                {{ fieldErrors.general }}
                            </div>

                            <q-btn type="submit" label="Login" class="full-width glass-btn q-py-sm" unelevated
                                :loading="isLoggingIn" :disable="isLoggingIn" />

                            <q-btn flat class="full-width glass-btn-secondary q-mt-sm" label="Continue with Google"
                                icon="music_note" @click="loginWithGoogle" />

                            <div class="text-center q-mt-lg subtitle">
                                Don't have an account?
                                <router-link to="/register" class="link-btn text-weight-medium"
                                    style="text-decoration: none">
                                    Register
                                </router-link>
                            </div>

                        </q-form>
                    </div>
                </div>

            </q-card>
        </div>
    </q-page>
</template>

<script setup>

import { useAuthStore } from 'stores/auth'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { Browser } from '@capacitor/browser'
import { App } from '@capacitor/app'
import { ref, onMounted, onBeforeUnmount } from 'vue'


const $q = useQuasar()
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = ref({
    email: '',
    password: ''
})

const isPwd = ref(true)
const isLoggingIn = ref(false)

const fieldErrors = ref({
    email: null,
    password: null,
    general: null
})

const getIntendedRoute = () => {
    const redirect = Array.isArray(route.query.redirect)
        ? route.query.redirect[0]
        : route.query.redirect

    if (typeof redirect !== 'string') return '/'
    if (!redirect.startsWith('/') || redirect.startsWith('//')) return '/'

    return redirect
}

const onLogin = async () => {
    isLoggingIn.value = true

    fieldErrors.value = {
        email: null,
        password: null,
        general: null
    }

    try {
        await auth.login(form.value)
        await router.replace(getIntendedRoute())
    } catch (err) {
        if (err?.response?.status === 422) {
            const errors = err.response.data.errors || {}

            fieldErrors.value = {
                email: errors.email?.[0] || null,
                password: errors.password?.[0] || null,
                general: null
            }
        } else {
            fieldErrors.value.general =
                err.response?.data?.message || err.message || 'Login failed'
        }

        $q.notify({
            type: 'negative',
            message: fieldErrors.value.general || 'Please correct the highlighted fields'
        })
    } finally {
        isLoggingIn.value = false
    }
}

let googleListener = null

import { getApiPath } from 'boot/api-config'

async function loginWithGoogle() {
    await Browser.open({ url: `${getApiPath()}auth/google/redirect` })
}

async function handleGoogleUrlOpen(event) {
    const url = event?.url || ''
    if (!url.startsWith('com.streama.app://auth-callback')) return

    await Browser.close()
    const token = new URL(url).searchParams.get('token')
    if (!token) return

    auth.token = token
    localStorage.setItem('token', token)
    await auth.fetchUser()
    await auth.registerDevice()
    await router.replace(getIntendedRoute())
}

onMounted(async () => {
    googleListener = await App.addListener('appUrlOpen', handleGoogleUrlOpen)
})
onBeforeUnmount(() => {
    googleListener?.remove()
})
</script>

<style lang="scss" scoped>
.login-page {
    min-height: 100vh;
    background: var(--app-bg-page);
}

.login-wrapper {
    width: 100%;
    max-width: 480px;
}

.title {
    color: var(--app-text-primary);
    font-weight: 700;
}

.subtitle {
    color: var(--app-text-secondary);
}

.link-btn {
    color: var(--q-primary);
}

.glass-icon {
    color: var(--app-text-secondary);
}

.glass-error {
    background: rgba(193, 0, 21, 0.12);
    border: 1px solid rgba(193, 0, 21, 0.3);
    color: var(--app-text-primary);
    border-radius: 8px;
}

.glass-btn {
    background: var(--q-primary);
    color: #ffffff;
}

.glass-btn-secondary {
    background: var(--app-surface);
    color: var(--app-text-primary);
    border: 1px solid var(--app-border);
}

// Input theming — light and dark need different glass treatments,
// so these live off the body classes rather than being forced via `dark` prop
:deep(.glass-input) {
    .q-field__control {
        color: var(--app-text-primary);
    }

    .q-field__label,
    .q-field__native,
    input {
        color: var(--app-text-primary);
    }

    .q-field__label {
        color: var(--app-text-secondary);
    }
}

.body--light .glass-card {
    background: var(--app-surface-elevated);
    border: 1px solid var(--app-border);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
}

.body--light :deep(.glass-input) {
    .q-field__control:before {
        border-color: var(--app-border);
    }
}

.body--dark .glass-card {
    background: rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(25px);
    -webkit-backdrop-filter: blur(25px);
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.body--dark :deep(.glass-input) {
    .q-field__control:before {
        border-color: rgba(255, 255, 255, 0.2);
    }
}
</style>