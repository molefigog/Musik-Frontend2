import { defineStore, acceptHMRUpdate } from 'pinia'
import { ApiService } from 'src/services/api'

const STORAGE_KEY = 'notifications_inbox'
const MAX_ITEMS = 100

function createHistoryKey(eventType, entityId) {
    if (!eventType) return null
    if (entityId === undefined || entityId === null || entityId === '') return null
    return `history:${eventType}:${entityId}`
}

function readFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        const parsed = raw ? JSON.parse(raw) : []
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

export const useNotificationsStore = defineStore('notifications', {
    state: () => ({
        inbox: readFromStorage(),
    }),

    getters: {
        unreadCount: (state) => state.inbox.filter((item) => item.read !== true).length,
    },

    actions: {
        persist() {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.inbox))
        },

        upsertInboxItem(entry) {
            const index = this.inbox.findIndex((item) => item.id === entry.id)

            if (index === -1) {
                this.inbox.unshift(entry)
            } else {
                this.inbox[index] = {
                    ...this.inbox[index],
                    ...entry,
                }
            }

            this.inbox.sort((a, b) => {
                const aTime = new Date(a.createdAt || 0).getTime()
                const bTime = new Date(b.createdAt || 0).getTime()
                return bTime - aTime
            })
        },

        async fetchHistory() {
            try {
                const { data } = await ApiService.get('/notifications')
                const serverItems = Array.isArray(data?.data) ? data.data : []

                serverItems.forEach((item) => {
                    const serverId = Number(item?.id)
                    if (!serverId) return

                    this.upsertInboxItem({
                        id: `server-${serverId}`,
                        serverId,
                        source: item?.source || 'system',
                        title: item?.title || 'Notification',
                        body: item?.body || '',
                        raw: item?.raw || null,
                        createdAt: item?.createdAt || new Date().toISOString(),
                        read: item?.read === true,
                    })
                })

                if (this.inbox.length > MAX_ITEMS) {
                    this.inbox = this.inbox.slice(0, MAX_ITEMS)
                }

                this.persist()
            } catch {
                // Keep local inbox if API is unavailable.
            }
        },

        addNotification(payload) {
            const entry = {
                id: payload?.id || Date.now() + Math.floor(Math.random() * 1000),
                source: payload?.source || 'unknown',
                title: payload?.title || 'Notification',
                body: payload?.body || '',
                raw: payload?.raw || null,
                createdAt: new Date().toISOString(),
                read: false,
            }

            this.upsertInboxItem(entry)
            if (this.inbox.length > MAX_ITEMS) {
                this.inbox = this.inbox.slice(0, MAX_ITEMS)
            }
            this.persist()
        },

        addHistoryEvent({
            eventType,
            entityId = null,
            title,
            body = '',
            raw = null,
            dedupe = false,
        }) {
            const dedupeKey = createHistoryKey(eventType, entityId)

            if (dedupe && dedupeKey && this.inbox.some((item) => item.id === dedupeKey)) {
                return
            }

            this.addNotification({
                id: dedupeKey || undefined,
                source: 'history',
                title: title || 'History update',
                body,
                raw,
            })
        },

        async markAsRead(id) {
            const item = this.inbox.find((entry) => entry.id === id)
            if (!item) return

            item.read = true
            this.persist()

            if (item.serverId) {
                try {
                    await ApiService.patch(`/notifications/${item.serverId}/read`)
                } catch {
                    // Local state already updated; ignore network errors.
                }
            }
        },

        async markAllAsRead() {
            this.inbox = this.inbox.map((item) => ({
                ...item,
                read: true,
            }))
            this.persist()

            try {
                await ApiService.patch('/notifications/read-all')
            } catch {
                // Local state already updated; ignore network errors.
            }
        },

        async clearInbox() {
            this.inbox = []
            this.persist()

            try {
                await ApiService.delete('/notifications')
            } catch {
                // Local state already cleared; ignore network errors.
            }
        },
    },
})

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useNotificationsStore, import.meta.hot))
}
