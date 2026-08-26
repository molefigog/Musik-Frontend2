<template>
    <q-dialog v-model="isOpen" position="bottom">
        <q-card v-if="task" style="width: 100%; max-width: 500px">
            <q-card-section>
                <div class="text-h6">{{ task.title }}</div>
                <div class="text-caption text-grey">{{ serviceLabel }}</div>
            </q-card-section>

            <q-separator />

            <q-card-section class="q-gutter-sm">
                <div>
                    <div class="text-caption text-grey">Description</div>
                    <div>{{ task.details || 'No description provided.' }}</div>
                </div>

                <div>
                    <div class="text-caption text-grey">Created</div>
                    <div>{{ formattedDate }}</div>
                </div>

                <div>
                    <div class="text-caption text-grey">Status</div>
                    <q-badge :color="task.status ? 'positive' : 'grey-6'">
                        {{ task.status ? 'Completed' : 'Processing' }}
                    </q-badge>
                </div>

                <div>
                    <div class="text-caption text-grey">Payment</div>
                    <q-badge :color="task.is_paid ? 'positive' : 'warning'">
                        {{ task.is_paid ? 'Paid' : 'Awaiting payment' }}
                    </q-badge>
                    <span v-if="task.amount" class="q-ml-sm">M{{ task.amount }}</span>
                </div>

                <div v-if="task.status">
                    <div class="text-caption text-grey">Available files</div>
                    <div class="q-gutter-xs">
                        <q-btn v-if="task.file_url" dense flat color="primary" icon="download" label="Download"
                            @click="downloadFile" />
                        <q-btn v-if="task.preview_url" dense flat color="secondary" icon="visibility" label="Preview"
                            @click="openPreview" />
                    </div>
                </div>
            </q-card-section>

            <q-card-actions align="right">
                <q-btn flat label="Close" v-close-popup />
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { getApiPath } from 'boot/api-config'

const props = defineProps({
    modelValue: { type: Boolean, required: true },
    task: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue'])

const isOpen = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val),
})

const serviceLabel = computed(() => {
    if (!props.task) return ''
    const labels = { beat: 'Beat', recording: 'Recording', artwork: 'Artwork' }
    return labels[props.task.service_type] ?? props.task.service_type
})

const formattedDate = computed(() =>
    props.task ? new Date(props.task.created_at).toLocaleDateString() : ''
)

const stripApiPrefix = (path) => path.replace(/^\/api(?=\/|$)/i, '') || '/'

function getSrc(url) {
    if (!url) return ''

    if (url.startsWith('http')) {
        try {
            const absoluteUrl = new URL(url)
            absoluteUrl.pathname = stripApiPrefix(absoluteUrl.pathname)
            return absoluteUrl.toString()
        } catch {
            return url.replace('/api/', '/')
        }
    }

    const configuredBase = (getApiPath() || '').replace(/\/$/, '')
    let base = configuredBase

    try {
        const absoluteBase = new URL(configuredBase, window.location.origin)
        absoluteBase.pathname = stripApiPrefix(absoluteBase.pathname).replace(/\/$/, '')
        base = absoluteBase.toString().replace(/\/$/, '')
    } catch {
        base = configuredBase.replace(/\/api(?=\/|$)/i, '')
    }

    const rawPath = url.startsWith('/') ? url : `/${url}`
    const path = stripApiPrefix(rawPath)

    return base ? `${base}${path}` : url
}

function downloadFile() {
    window.open(getSrc(props.task.file_url), '_blank')
}

function openPreview() {
    window.open(getSrc(props.task.preview_url), '_blank')
}
</script>
