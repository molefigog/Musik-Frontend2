import { boot } from 'quasar/wrappers'

export default boot(({ app }) => {
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) {
        app.config.globalProperties.$q?.dark?.set(saved === '1')
    }
})
