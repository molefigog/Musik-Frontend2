import { boot } from 'quasar/wrappers'
import { Notify } from 'quasar'
import { initializeNotifications } from 'src/services/notifications'

export default boot(async () => {
    await initializeNotifications({
        onFcmReceived: (notification) => {
            const title = notification?.notification?.title || notification?.title || 'Notification'
            const body =
                notification?.notification?.body || notification?.body || 'You have a new message'

            Notify.create({
                type: 'info',
                message: `${title}: ${body}`,
            })
        },
        onFcmAction: (event) => {
            const title = event?.notification?.title || 'FCM notification opened'

            Notify.create({
                type: 'positive',
                message: title,
            })
        },
        onFcmToken: (event) => {
            const token = event?.token
            if (!token) return
        },
        onLocalAction: (event) => {
            const title = event?.notification?.title || 'Local notification opened'

            Notify.create({
                type: 'positive',
                message: title,
            })
        },
    })
})
