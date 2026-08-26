<template>
    <q-page class="q-pa-md">
        <div class="text-h6 q-mb-md">My Tasks</div>

        <q-inner-loading :showing="tasksStore.loading" />

        <div v-if="!tasksStore.loading && tasksStore.tasks.length === 0" class="text-grey text-center q-mt-xl">
            No tasks yet.
        </div>

        <div class="column q-gutter-sm">
            <task-card v-for="task in tasksStore.tasks" :key="task.id" :task="task" @details="openDetails" />
        </div>

        <q-btn fab color="primary" icon="add" class="fixed-bottom-right q-ma-md" @click="openCreateDialog" />

        <q-dialog v-model="createDialogOpen">
            <q-card style="min-width: min(92vw, 420px)">
                <q-card-section>
                    <div class="text-h6">Create task</div>
                </q-card-section>

                <q-card-section class="q-pt-none">
                    <q-form @submit.prevent="submitCreateTask" class="column q-gutter-sm">
                        <q-select v-model="newTask.service_type" :options="serviceOptions" label="Service type"
                            emit-value map-options outlined required />

                        <q-input v-model="newTask.title" label="Title" outlined required />
                        <q-input v-model="newTask.details" label="Details" type="textarea" outlined autogrow />
                        <div class="row justify-end q-gutter-sm">
                            <q-btn flat label="Cancel" v-close-popup />
                            <q-btn color="primary" label="Create task" type="submit" :loading="creating" />
                        </div>
                    </q-form>
                </q-card-section>
            </q-card>
        </q-dialog>

        <task-details-sheet v-model="detailsOpen" :task="selectedTask" />
    </q-page>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useTasksStore } from 'src/stores/tasks'
import tasksApi from 'src/services/tasks-api'
import TaskCard from 'components/TaskCard.vue'
import TaskDetailsSheet from 'components/TaskDetailsSheet.vue'

const tasksStore = useTasksStore()
const $q = useQuasar()
const detailsOpen = ref(false)
const createDialogOpen = ref(false)
const creating = ref(false)
const selectedTask = ref(null)
const newTask = ref({
    service_type: 'beat',
    title: '',
    details: '',
})

const TASK_POLL_INTERVAL_MS = 20000
let tasksPollTimer = null

const serviceOptions = [
    { label: 'Beat', value: 'beat' },
    { label: 'Recording', value: 'recording' },
    { label: 'Artwork', value: 'artwork' },
]

function openDetails(task) {
    selectedTask.value = task
    detailsOpen.value = true
}

function openCreateDialog() {
    newTask.value = { service_type: 'beat', title: '', details: '' }
    createDialogOpen.value = true
}

async function submitCreateTask() {
    if (!newTask.value.title.trim()) return

    creating.value = true
    try {
        const { data } = await tasksApi.createTask({
            service_type: newTask.value.service_type,
            title: newTask.value.title.trim(),
            details: newTask.value.details.trim(),
        })
        tasksStore.tasks = [data.data ?? data, ...tasksStore.tasks]
        createDialogOpen.value = false
        $q.notify({ type: 'positive', message: 'Task created. Pricing will be set by the team.' })
    } catch (error) {
        $q.notify({ type: 'negative', message: error?.response?.data?.message || 'Failed to create task' })
    } finally {
        creating.value = false
    }
}

onMounted(() => {
    tasksStore.fetchTasks()
    tasksPollTimer = window.setInterval(() => {
        tasksStore.fetchTasks()
    }, TASK_POLL_INTERVAL_MS)
})

onBeforeUnmount(() => {
    if (tasksPollTimer) {
        window.clearInterval(tasksPollTimer)
        tasksPollTimer = null
    }
})
</script>
