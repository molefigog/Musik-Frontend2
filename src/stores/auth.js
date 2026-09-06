import { defineStore, acceptHMRUpdate } from 'pinia'
// import { api } from 'boot/axios'
import { ApiService } from 'src/services/api'
import { Device } from '@capacitor/device'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        token: localStorage.getItem('token') || null,
    }),

    getters: {
        isLoggedIn: (state) => !!state.token,
    },

    actions: {
        async login(credentials) {
            const { data } = await ApiService.post('login', credentials)
            this.token = data.token
            localStorage.setItem('token', data.token)
            await this.fetchUser()
            await this.registerDevice()
        },

        async register(payload) {
            const { data } = await ApiService.post('register', payload)
            this.token = data.token
            localStorage.setItem('token', data.token)
            await this.fetchUser()
            await this.registerDevice()
        },

        async fetchUser(config = {}) {
            try {
                const { data } = await ApiService.get('me', {
                    ...config,
                    headers: { Authorization: `Bearer ${this.token}` },
                })
                this.user = data.user
            } catch {
                this.logout()
            }
        },

        async updateProfile(profileData) {
            const { data } = await ApiService.put('update-profile', profileData, {
                headers: { Authorization: `Bearer ${this.token}` },
            })
            this.user = data.user
        },

        async registerDevice() {
            try {
                const permission = await FirebaseMessaging.requestPermissions()
                if (!permission.receive) return

                const { token: fcmToken } = await FirebaseMessaging.getToken()
                const info = await Device.getInfo()
                const deviceName = `${info.manufacturer} ${info.model}`

                await ApiService.post(
                    'fcm-token',
                    {
                        user_id: this.user?.id,
                        token: fcmToken,
                        device_name: deviceName,
                    },
                    {
                        headers: { Authorization: `Bearer ${this.token}` },
                    },
                )

                console.log('Device registered successfully')
            } catch (err) {
                console.error('Device registration failed', err)
            }
        },
        async init() {
            if (this.token && !this.user) {
                await this.fetchUser()
            }
        },
        async logout() {
            try {
                await ApiService.post(
                    'logout',
                    {},
                    {
                        headers: { Authorization: `Bearer ${this.token}` },
                    },
                )
            } catch {
                /* empty */
            }

            this.token = null
            this.user = null
            localStorage.removeItem('token')
        },
    },
})

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
