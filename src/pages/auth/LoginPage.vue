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

                            <q-input v-model="form.email" label="Email" dark outlined class="glass-input"
                                :rules="[val => !!val || 'Username is required']" :error="!!fieldErrors.email"
                                :error-message="fieldErrors.email">
                                <template v-slot:prepend>
                                    <q-icon name="person" color="white" />
                                </template>
                            </q-input>

                            <q-input v-model="form.password" label="Password" dark outlined class="glass-input"
                                :type="isPwd ? 'password' : 'text'" :rules="[val => !!val || 'Password is required']"
                                :error="!!fieldErrors.password" :error-message="fieldErrors.password">
                                <template v-slot:prepend>
                                    <q-icon name="lock" color="white" />
                                </template>

                                <template v-slot:append>
                                    <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer"
                                        color="white" @click="isPwd = !isPwd" />
                                </template>
                            </q-input>

                            <div v-if="fieldErrors.general" class="glass-error text-white q-pa-md">
                                {{ fieldErrors.general }}
                            </div>

                            <q-btn type="submit" label="Login" class="full-width glass-btn q-py-sm" unelevated
                                :loading="isLoggingIn" :disable="isLoggingIn" />

                            <q-btn flat class="full-width glass-btn-secondary q-mt-sm" label="Continue with Google"
                                icon="music_note" />

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
import { ref } from 'vue'
import { useAuthStore } from 'stores/auth'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

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
</script>
