<template>
    <q-page class="q-pa-md" style="max-width: 980px; margin: 0 auto;">
        <div>
            <div class="text-h5 text-weight-bold q-mb-sm">System Settings</div>
            <div class="text-caption text-grey-5 q-mb-lg">
                Device diagnostics and notification permissions.
            </div>

            <q-card flat bordered class="q-mb-md">
                <q-card-section>
                    <div class="text-subtitle1 text-weight-medium q-mb-sm">App Info</div>
                    <q-list dense separator>
                        <q-item>
                            <q-item-section>App name</q-item-section>
                            <q-item-section side>{{ appInfo.name }}</q-item-section>
                        </q-item>
                        <q-item>
                            <q-item-section>Version</q-item-section>
                            <q-item-section side>{{ appInfo.version }}</q-item-section>
                        </q-item>
                        <q-item>
                            <q-item-section>Build mode</q-item-section>
                            <q-item-section side>{{ appInfo.mode }}</q-item-section>
                        </q-item>
                        <q-item>
                            <q-item-section>API URL</q-item-section>
                            <q-item-section side class="text-right">{{ appInfo.apiPath }}</q-item-section>
                        </q-item>
                    </q-list>
                </q-card-section>
            </q-card>

            <q-card flat bordered class="q-mb-md">
                <q-card-section>
                    <div class="text-subtitle1 text-weight-medium q-mb-sm">Platform</div>
                    <q-list dense separator>
                        <q-item>
                            <q-item-section>Detected platform</q-item-section>
                            <q-item-section side>{{ platformInfo.platform }}</q-item-section>
                        </q-item>
                        <q-item>
                            <q-item-section>Native app</q-item-section>
                            <q-item-section side>{{ platformInfo.isNative ? 'Yes' : 'No' }}</q-item-section>
                        </q-item>
                        <q-item>
                            <q-item-section>OS / Version</q-item-section>
                            <q-item-section side>{{ platformInfo.operatingSystem }} {{ platformInfo.osVersion
                                }}</q-item-section>
                        </q-item>
                        <q-item>
                            <q-item-section>Model</q-item-section>
                            <q-item-section side>{{ platformInfo.model }}</q-item-section>
                        </q-item>
                        <q-item>
                            <q-item-section>Manufacturer</q-item-section>
                            <q-item-section side>{{ platformInfo.manufacturer }}</q-item-section>
                        </q-item>
                    </q-list>
                </q-card-section>
            </q-card>

            <q-card flat bordered class="q-mb-md">
                <q-card-section>
                    <div class="text-subtitle1 text-weight-medium q-mb-sm">Network</div>
                    <q-list dense separator>
                        <q-item>
                            <q-item-section>Connected</q-item-section>
                            <q-item-section side>{{ networkInfo.connected ? 'Online' : 'Offline' }}</q-item-section>
                        </q-item>
                        <q-item>
                            <q-item-section>Connection type</q-item-section>
                            <q-item-section side>{{ networkInfo.connectionType }}</q-item-section>
                        </q-item>
                    </q-list>
                    <div class="q-mt-md">
                        <q-btn icon="refresh" label="Refresh network" @click="refreshNetwork" />
                    </div>
                </q-card-section>
            </q-card>

            <q-card flat bordered class="q-mb-md">
                <q-card-section>
                    <div class="text-subtitle1 text-weight-medium q-mb-sm">Screen</div>
                    <q-list dense separator>
                        <q-item>
                            <q-item-section>Resolution</q-item-section>
                            <q-item-section side>{{ screenInfo.width }} x {{ screenInfo.height }}</q-item-section>
                        </q-item>
                        <q-item>
                            <q-item-section>Viewport</q-item-section>
                            <q-item-section side>{{ screenInfo.viewportWidth }} x {{ screenInfo.viewportHeight
                                }}</q-item-section>
                        </q-item>
                        <q-item>
                            <q-item-section>Pixel ratio</q-item-section>
                            <q-item-section side>{{ screenInfo.pixelRatio }}</q-item-section>
                        </q-item>
                        <q-item>
                            <q-item-section>Orientation</q-item-section>
                            <q-item-section side>{{ screenInfo.orientation }}</q-item-section>
                        </q-item>
                    </q-list>
                </q-card-section>
            </q-card>

            <q-card flat bordered class="q-mb-md">
                <q-card-section>
                    <div class="text-subtitle1 text-weight-medium q-mb-sm">Permissions</div>
                    <q-list dense separator>
                        <q-item>
                            <q-item-section>Notifications</q-item-section>
                            <q-item-section side>{{ permissions.notifications }}</q-item-section>
                        </q-item>
                        <q-item>
                            <q-item-section>Storage (Filesystem)</q-item-section>
                            <q-item-section side>{{ permissions.storage }}</q-item-section>
                        </q-item>
                    </q-list>
                    <div class="row q-gutter-sm q-mt-md">
                        <q-btn icon="notifications" label="Allow notifications"
                            @click="requestNotificationPermission" />
                        <q-btn icon="folder" label="Allow storage" @click="requestStoragePermission" />
                    </div>
                </q-card-section>
            </q-card>

            <q-card flat bordered class="q-mb-md">
                <q-card-section>
                    <div class="text-subtitle1 text-weight-medium q-mb-sm">Notifications</div>
                    <q-list dense separator>
                        <q-item>
                            <q-item-section>FCM permission</q-item-section>
                            <q-item-section side>{{ notificationInfo.fcmPermission }}</q-item-section>
                        </q-item>
                        <q-item>
                            <q-item-section>Local permission</q-item-section>
                            <q-item-section side>{{ notificationInfo.localPermission }}</q-item-section>
                        </q-item>
                        <q-item>
                            <q-item-section>FCM token</q-item-section>
                            <q-item-section side class="text-right" style="max-width: 14rem; word-break: break-all;">
                                {{ notificationInfo.fcmToken || 'Not available' }}
                            </q-item-section>
                        </q-item>
                    </q-list>

                    <div class="row q-gutter-sm q-mt-md">
                        <q-btn icon="notifications_active" label="Enable FCM" @click="enableFcmNotifications" />
                        <q-btn flat icon="inbox" label="Open Inbox" to="/notifications" />
                    </div>

                    <div v-if="notificationInfo.lastEvent" class="q-mt-md text-caption">
                        Last event: {{ notificationInfo.lastEvent }}
                    </div>
                </q-card-section>
            </q-card>

            <div class="row q-gutter-sm">
                <q-btn flat icon="refresh" label="Reload all info" @click="loadAll" />
            </div>
        </div>
    </q-page>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { Device } from '@capacitor/device'
import { Capacitor } from '@capacitor/core'
import { Network } from '@capacitor/network'
import { Filesystem } from '@capacitor/filesystem'
import {
    getFcmPermission,
    getFcmToken,
    getLocalNotificationPermission,
    requestFcmPermission,
} from 'src/services/notifications'

const $q = useQuasar()

const appInfo = ref({
    name: process.env.PRODUCT_NAME || 'GW ENT',
    version: process.env.npm_package_version || '0.0.1',
    mode: process.env.DEV ? 'development' : 'production',
    apiPath: process.env.API_PATH || 'not set',
})

const platformInfo = ref({
    platform: 'unknown',
    isNative: false,
    operatingSystem: 'unknown',
    osVersion: 'unknown',
    model: 'unknown',
    manufacturer: 'unknown',
})

const networkInfo = ref({
    connected: navigator.onLine,
    connectionType: 'unknown',
})

const screenInfo = ref({
    width: window.screen?.width || 0,
    height: window.screen?.height || 0,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
    orientation: window.screen?.orientation?.type || 'unknown',
})

const permissions = ref({
    notifications: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
    storage: 'unknown',
})

const notificationInfo = ref({
    fcmPermission: 'unknown',
    localPermission: 'unknown',
    fcmToken: null,
    lastEvent: '',
})

let removeNetworkListener = null

function notify(type, message) {
    $q.notify({ type, message })
}

async function loadPlatformInfo() {
    try {
        const info = await Device.getInfo()
        platformInfo.value = {
            platform: Capacitor.getPlatform(),
            isNative: Capacitor.isNativePlatform(),
            operatingSystem: info.operatingSystem || 'unknown',
            osVersion: info.osVersion || 'unknown',
            model: info.model || 'unknown',
            manufacturer: info.manufacturer || 'unknown',
        }
    } catch {
        platformInfo.value.platform = Capacitor.getPlatform()
        platformInfo.value.isNative = Capacitor.isNativePlatform()
    }
}

function updateScreenInfo() {
    screenInfo.value = {
        width: window.screen?.width || 0,
        height: window.screen?.height || 0,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        pixelRatio: window.devicePixelRatio || 1,
        orientation: window.screen?.orientation?.type || 'unknown',
    }
}

async function refreshNetwork() {
    try {
        const status = await Network.getStatus()
        networkInfo.value.connected = !!status.connected
        networkInfo.value.connectionType = status.connectionType || 'unknown'
    } catch {
        networkInfo.value.connected = navigator.onLine
        networkInfo.value.connectionType = navigator.onLine ? 'online' : 'offline'
    }
}

async function loadStoragePermissionStatus() {
    try {
        const storagePermission = await Filesystem.checkPermissions()
        permissions.value.storage = storagePermission.publicStorage || storagePermission.privateStorage || 'unknown'
    } catch {
        permissions.value.storage = 'not available'
    }
}

async function requestNotificationPermission() {
    try {
        const permission = await requestFcmPermission()
        permissions.value.notifications = permission
        notificationInfo.value.fcmPermission = permission
        notify(permission === 'granted' ? 'positive' : 'warning', `Notification permission: ${permission}`)
    } catch {
        notify('negative', 'Could not request notification permission')
    }
}

async function loadNotificationInfo() {
    const [fcmPermission, localPermission, fcmToken] = await Promise.all([
        getFcmPermission(),
        getLocalNotificationPermission(),
        getFcmToken(),
    ])

    notificationInfo.value.fcmPermission = fcmPermission
    notificationInfo.value.localPermission = localPermission
    notificationInfo.value.fcmToken = fcmToken
}

async function enableFcmNotifications() {
    const permission = await requestFcmPermission()
    notificationInfo.value.fcmPermission = permission

    if (permission !== 'granted') {
        notify('warning', `FCM permission: ${permission}`)
        return
    }

    const token = await getFcmToken()
    notificationInfo.value.fcmToken = token
    notify(token ? 'positive' : 'warning', token ? 'FCM enabled and token loaded' : 'FCM enabled but no token yet')
}

async function requestStoragePermission() {
    try {
        const storagePermission = await Filesystem.requestPermissions()
        permissions.value.storage =
            storagePermission.publicStorage || storagePermission.privateStorage || 'unknown'

        notify(
            permissions.value.storage === 'granted' ? 'positive' : 'warning',
            `Storage permission: ${permissions.value.storage}`,
        )
    } catch {
        permissions.value.storage = 'not available'
        notify('warning', 'Storage permission request is unavailable in this environment')
    }
}

async function loadAll() {
    await Promise.all([
        loadPlatformInfo(),
        refreshNetwork(),
        loadStoragePermissionStatus(),
        loadNotificationInfo(),
    ])
    updateScreenInfo()
}

onMounted(async () => {
    await loadAll()

    window.addEventListener('resize', updateScreenInfo)

    try {
        const handle = await Network.addListener('networkStatusChange', (status) => {
            networkInfo.value.connected = !!status.connected
            networkInfo.value.connectionType = status.connectionType || 'unknown'
        })

        removeNetworkListener = async () => {
            await handle.remove()
        }
    } catch {
        removeNetworkListener = null
    }
})

onBeforeUnmount(async () => {
    window.removeEventListener('resize', updateScreenInfo)
    if (removeNetworkListener) {
        await removeNetworkListener()
    }
})
</script>
