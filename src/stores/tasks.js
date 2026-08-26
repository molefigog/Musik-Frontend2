import { defineStore } from 'pinia'
import { Notify } from 'quasar'
import tasksApi from 'src/services/tasks-api'
import { useNotificationsStore } from 'src/stores/notifications'

export const useTasksStore = defineStore('tasks', {
  state: () => ({
    tasks: [],
    loading: false,
    error: null,
    hasFetchedOnce: false,
  }),

  actions: {
    async fetchTasks() {
      this.loading = true
      this.error = null
      try {
        const previousStatusById = new Map(
          this.tasks.map((task) => [Number(task?.id), Boolean(task?.status)])
        )
        const { data } = await tasksApi.getTasks()
        const nextTasks = data.data ?? data // handles both resource-collection and plain-array shapes
        this.tasks = nextTasks

        if (this.hasFetchedOnce) {
          const notifications = useNotificationsStore()
          nextTasks.forEach((task) => {
            const id = Number(task?.id)
            if (!id) return

            const wasCompleted = previousStatusById.get(id)
            const isCompleted = Boolean(task?.status)

            if (wasCompleted === false && isCompleted === true) {
              notifications.addHistoryEvent({
                eventType: 'task.completed',
                entityId: id,
                title: 'Task completed',
                body: task?.title || `Task #${id} is now completed`,
                raw: { taskId: id, task },
                dedupe: true,
              })

              Notify.create({
                type: 'positive',
                message: `Task completed: ${task?.title || `#${id}`}`,
              })
            }
          })
        }

        this.hasFetchedOnce = true
      } catch (err) {
        this.error = err
      } finally {
        this.loading = false
      }
    },

    async createTask(payload) {
      this.loading = true
      this.error = null
      try {
        const { data } = await tasksApi.createTask(payload)
        const task = data.data ?? data
        this.tasks = [task, ...this.tasks]

        const notifications = useNotificationsStore()
        notifications.addHistoryEvent({
          eventType: 'task.created',
          entityId: Number(task?.id) || Date.now(),
          title: 'Task created',
          body: task?.title || 'Your task was created successfully',
          raw: { taskId: task?.id, task },
          dedupe: true,
        })

        Notify.create({
          type: 'positive',
          message: `Task created: ${task?.title || 'New task'}`,
        })

        return task
      } catch (err) {
        this.error = err
        throw err
      } finally {
        this.loading = false
      }
    },
  },
})
