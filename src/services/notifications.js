import { Capacitor } from '@capacitor/core'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { LocalNotifications } from '@capacitor/local-notifications'

let initialized = false
let listeners = {
    fcmReceived: null,
    fcmAction: null,
    fcmToken: null,
    localAction: null,
}
let audioNotificationActionHandler = null

export const setAudioNotificationActionHandler = (handler) => {
    audioNotificationActionHandler = handler
}

export async function showAudioNotification({ title, isPlaying }) {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return

    try {
        await LocalNotifications.registerActionTypes({
            types: [{
                id: 'audio-controls',
                actions: [
                    { id: 'toggle', title: isPlaying ? 'Pause' : 'Play' },
                    { id: 'stop', title: 'Stop' },
                ],
            }],
        })
        await LocalNotifications.schedule({
            notifications: [{
                id: 7421,
                title: title || 'GW ENT Music',
                body: isPlaying ? 'Now playing' : 'Paused',
                ongoing: true,
                autoCancel: false,
                actionTypeId: 'audio-controls',
            }],
        })
    } catch (error) {
        console.error('Failed to update audio notification', error)
    }
}

export async function clearAudioNotification() {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return

    try {
        await LocalNotifications.cancel({ notifications: [{ id: 7421 }] })
    } catch (error) {
        console.error('Failed to clear audio notification', error)
    }
}

function normalizePermission(result) {
    if (!result) return 'unknown'
    if (typeof result === 'string') return result
    if (result.receive) return result.receive
    if (result.display) return result.display
    return 'unknown'
}

export async function requestFcmPermission() {
    try {
        const permission = await FirebaseMessaging.requestPermissions()
        return normalizePermission(permission)
    } catch {
        return 'unavailable'
    }
}

export async function getFcmPermission() {
    try {
        const permission = await FirebaseMessaging.checkPermissions()
        return normalizePermission(permission)
    } catch {
        return 'unavailable'
    }
}

export async function getFcmToken() {
    try {
        const { token } = await FirebaseMessaging.getToken()
        return token || null
    } catch {
        return null
    }
}

export async function requestLocalNotificationPermission() {
    try {
        const permission = await LocalNotifications.requestPermissions()
        return normalizePermission(permission)
    } catch {
        return 'unavailable'
    }
}

export async function getLocalNotificationPermission() {
    try {
        const permission = await LocalNotifications.checkPermissions()
        return normalizePermission(permission)
    } catch {
        return 'unavailable'
    }
}

export async function sendTestLocalNotification(
    title = 'Local Notification',
    body = 'This is a local test notification',
) {
    const now = Date.now()

    await LocalNotifications.schedule({
        notifications: [
            {
                id: now % 2147483647,
                title,
                body,
                schedule: { at: new Date(Date.now() + 1500), allowWhileIdle: true },
            },
        ],
    })
}

export function initializeNotificationListeners(handlers = {}) {
    if (initialized) return
    initialized = true

    listeners.fcmReceived = FirebaseMessaging.addListener(
        'notificationReceived',
        (notification) => {
            if (typeof handlers.onFcmReceived === 'function') {
                handlers.onFcmReceived(notification)
            }
        },
    )

    listeners.fcmAction = FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
        if (typeof handlers.onFcmAction === 'function') {
            handlers.onFcmAction(event)
        }
    })

    listeners.fcmToken = FirebaseMessaging.addListener('tokenReceived', (event) => {
        if (typeof handlers.onFcmToken === 'function') {
            handlers.onFcmToken(event)
        }
    })

    listeners.localAction = LocalNotifications.addListener(
        'localNotificationActionPerformed',
        (event) => {
            const actionId = event?.actionId
            if (audioNotificationActionHandler && (actionId === 'toggle' || actionId === 'stop')) {
                audioNotificationActionHandler(actionId)
                return
            }

            if (typeof handlers.onLocalAction === 'function') {
                handlers.onLocalAction(event)
            }
        },
    )
}

export async function initializeNotifications(handlers = {}) {
    initializeNotificationListeners(handlers)

    const platform = Capacitor.getPlatform()
    const isNative = Capacitor.isNativePlatform()

    const localPermission = await getLocalNotificationPermission()
    const fcmPermission = await getFcmPermission()
    const fcmToken = fcmPermission === 'granted' ? await getFcmToken() : null

    return {
        platform,
        isNative,
        localPermission,
        fcmPermission,
        fcmToken,
    }
}

export async function removeNotificationListeners() {
    const removals = Object.values(listeners)
    listeners = {
        fcmReceived: null,
        fcmAction: null,
        fcmToken: null,
        localAction: null,
    }
    initialized = false

    await Promise.all(
        removals
            .filter((item) => item && typeof item.remove === 'function')
            .map((item) => item.remove()),
    )
}
