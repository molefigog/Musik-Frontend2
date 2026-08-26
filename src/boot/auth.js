import { boot } from 'quasar/wrappers'
import { useAuthStore } from 'stores/auth'

export default boot(() => {
  const auth = useAuthStore()
  auth.hydrate()
})
