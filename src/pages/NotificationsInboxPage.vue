<template>
    <q-page class="q-pa-md" style="max-width: 980px; margin: 0 auto;">
        <div class="row items-center justify-between q-mb-md">
            <div>
                <div class="text-h5 text-weight-bold">Notifications Inbox</div>
                <div class="text-caption text-grey-6">
                    Download and task history events are stored here.
                </div>
            </div>

            <div class="row q-gutter-sm">
                <q-btn flat icon="done_all" label="Mark all read" @click="store.markAllAsRead" />
                <q-btn color="negative" icon="delete_sweep" label="Clear" @click="store.clearInbox" />
            </div>
        </div>

        <q-list bordered separator>
            <q-item v-if="store.inbox.length === 0">
                <q-item-section>
                    <q-item-label>No notifications yet</q-item-label>
                    <q-item-label caption>
                        Completed downloads and task events will appear here.
                    </q-item-label>
                </q-item-section>
            </q-item>

            <q-item v-for="item in store.inbox" :key="item.id" clickable @click="store.markAsRead(item.id)">
                <q-item-section avatar>
                    <q-icon :name="item.source === 'fcm' ? 'notifications_active' : 'notification_important'" />
                </q-item-section>

                <q-item-section>
                    <q-item-label :class="item.read ? '' : 'text-weight-bold'">
                        {{ item.title }}
                    </q-item-label>
                    <q-item-label caption>{{ item.body || 'No body text' }}</q-item-label>
                    <q-item-label caption>
                        {{ item.source.toUpperCase() }} · {{ formatTime(item.createdAt) }}
                    </q-item-label>
                </q-item-section>

                <q-item-section side>
                    <q-badge v-if="!item.read" color="primary" label="New" />
                </q-item-section>
            </q-item>
        </q-list>
    </q-page>
</template>

<script setup>
import { onMounted } from 'vue'
import { useNotificationsStore } from 'src/stores/notifications'

const store = useNotificationsStore()

onMounted(() => {
    store.fetchHistory()
})

function formatTime(value) {
    try {
        return new Date(value).toLocaleString()
    } catch {
        return value
    }
}
</script>
