import { boot } from 'quasar/wrappers'
import { initLogger } from 'src/composables/useLogger'

export default boot(({ app }) => {
    initLogger({ app, captureGlobalErrors: true })
})
