<template>
    <q-layout view="lHh Lpr lFf">
        <!-- App header -->
        <q-header class="glass-header-main">
            <q-toolbar class="toolbar-glass">
                <q-btn v-if="isWeb" flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />
                <q-btn v-if="isApk && auth.isLoggedIn" flat round dense icon="notifications" aria-label="Notifications"
                    to="/notifications">
                    <q-badge v-if="unreadNotifications > 0" color="primary" floating>
                        {{ unreadNotifications }}
                    </q-badge>
                </q-btn>
                <q-toolbar-title class="text-center">
                    <span class="text-caption">
                        {{ $q.screen.gt.sm ? 'Genius Works Ent' : 'GW ENT' }}
                    </span>
                </q-toolbar-title>

                <!-- Right: Buttons -->
                <div class="row items-center q-gutter-sm">
                    <div class="gt-sm row items-center">
                        <q-btn flat @click="resetSession" icon="refresh" round :size="$q.screen.gt.sm ? 'md' : 'sm'" />
                        <q-btn flat @click="toggleDarkMode" :icon="darkModeIcon" round
                            :size="$q.screen.gt.sm ? 'md' : 'sm'" />
                    </div>
                    <q-btn flat round icon="shopping_cart" :to="{ name: 'cart-checkout' }"
                        :size="$q.screen.gt.sm ? 'md' : 'sm'">
                        <q-badge v-if="cart.count > 0" color="red" floating>{{ cart.count }}</q-badge>
                    </q-btn>
                    <q-btn v-if="auth.isLoggedIn" flat @click="logout" icon="logout" round
                        :size="$q.screen.gt.sm ? 'md' : 'sm'" />
                </div>
            </q-toolbar>
        </q-header>

        <q-drawer v-if="isWeb" v-model="leftDrawerOpen" show-if-above bordered class="glass-drawer">
            <q-list>
                <q-item to="/" clickable v-ripple>
                    <q-item-section avatar>
                        <q-icon name="home" />
                    </q-item-section>

                    <q-item-section>Home</q-item-section>
                </q-item>

                <!-- <q-item to="/payment" clickable v-ripple>
                    <q-item-section avatar>
                        <q-icon name="info" />
                    </q-item-section>

                    <q-item-section>Payments</q-item-section>
                </q-item> -->

                <q-item v-if="auth.isLoggedIn" to="/tasks" clickable v-ripple>
                    <q-item-section avatar>
                        <q-icon name="info" />
                    </q-item-section>

                    <q-item-section>Tasks</q-item-section>
                </q-item>

                <q-item v-if="auth.isLoggedIn" to="/profile" clickable v-ripple>
                    <q-item-section avatar>
                        <q-icon name="person" />
                    </q-item-section>

                    <q-item-section>Profile</q-item-section>
                </q-item>

                <q-item v-if="auth.isLoggedIn" to="/downloads" clickable v-ripple>
                    <q-item-section avatar>
                        <q-icon name="download" />
                    </q-item-section>

                    <q-item-section>Downloads</q-item-section>
                </q-item>

                <q-item v-if="auth.isLoggedIn" to="/releases" clickable v-ripple>
                    <q-item-section avatar>
                        <q-icon name="album" />
                    </q-item-section>
                    <q-item-section>Releases</q-item-section>
                </q-item>

                <q-item to="/settings" clickable v-ripple>
                    <q-item-section avatar>
                        <q-icon name="settings" />
                    </q-item-section>

                    <q-item-section>Settings</q-item-section>
                </q-item>

                <q-item v-if="auth.isLoggedIn" to="/notifications" clickable v-ripple>
                    <q-item-section avatar>
                        <q-icon name="notifications" />
                    </q-item-section>

                    <q-item-section>Notifications</q-item-section>
                    <q-item-section side>
                        <q-badge v-if="unreadNotifications > 0" color="primary">{{ unreadNotifications }}</q-badge>
                    </q-item-section>
                </q-item>

                <q-item v-if="!auth.isLoggedIn" to="/login" clickable v-ripple>
                    <q-item-section avatar>
                        <q-icon name="login" />
                    </q-item-section>

                    <q-item-section>Login</q-item-section>
                </q-item>


            </q-list>
        </q-drawer>

        <q-footer v-if="!isWeb" class="app-footer">
            <div class="row justify-around items-center q-px-sm q-py-xs">
                <q-btn flat round dense icon="home" aria-label="Home" to="/" />
                <q-btn v-if="auth.isLoggedIn" flat round dense icon="task_alt" aria-label="Tasks" to="/tasks" />
                <q-btn v-if="auth.isLoggedIn" flat round dense icon="person" aria-label="Profile" to="/profile" />
                <q-btn flat round dense icon="settings" aria-label="Settings" to="/settings" />
                <q-btn v-if="auth.isLoggedIn" flat round dense icon="album" aria-label="Releases" to="/releases" />

                <q-btn v-if="auth.isLoggedIn" flat round dense icon="download" aria-label="Downloads" to="/downloads" />
                <q-btn v-else flat round dense icon="login" aria-label="Login" to="/login" />
            </div>
        </q-footer>

        <q-page-container>
            <router-view />
        </q-page-container>

        <AudioPlayer :tracks="sharedTracks" />
    </q-layout>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useAuthStore } from 'stores/auth'
import { useQuasar } from 'quasar'
import { Capacitor } from '@capacitor/core'
import { useCartStore } from 'src/stores/cart'
import { useNotificationsStore } from 'src/stores/notifications'
import AudioPlayer from 'src/components/AudioPlayer.vue'
import { sharedTracks } from 'src/services/audio-player-state'
const $q = useQuasar()
const auth = useAuthStore()
const isWeb = Capacitor.getPlatform() === 'web'
const isApk = Capacitor.getPlatform() === 'android'

const cart = useCartStore()
const notifications = useNotificationsStore()
const unreadNotifications = computed(() => notifications.unreadCount)

function resetSession() {
    location.reload()
}
const logout = async () => {
    $q.loading.show({
        message: 'Logging out...',
        spinnerColor: 'white',
        messageColor: 'white',
        spinnerSize: 40,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    })

    try {
        await auth.logout()
        resetSession()
    } catch (error) {
        $q.notify({ type: 'negative', message: `${error} Logout failed` })
    } finally {
        $q.loading.hide()
    }
}

const leftDrawerOpen = ref(false)

function toggleLeftDrawer() {
    leftDrawerOpen.value = !leftDrawerOpen.value
}
</script>
