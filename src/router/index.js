import { defineRouter } from '#q-app/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import { useAuthStore } from 'stores/auth'
import routes from './routes'

const isSafeInternalRedirect = (path) => {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')
}

export default defineRouter(function () {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  Router.beforeEach(async (to, from, next) => {
    const auth = useAuthStore()

    const redirectToLogin = () => {
      if (to.path === '/login') {
        return next()
      }

      return next({
        path: '/login',
        query: { redirect: to.fullPath },
      })
    }

    // 🔁 Handle refresh (token exists but user not loaded)
    if (auth.token && !auth.user) {
      try {
        await auth.init()
      } catch {
        return redirectToLogin()
      }
    }

    // 🔒 Requires login
    if (to.meta.requiresAuth && !auth.isLoggedIn) {
      return redirectToLogin()
    }

    // ↩️ If already logged in, don't stay on auth screens
    if ((to.path === '/login' || to.path === '/register') && auth.isLoggedIn) {
      const intended = Array.isArray(to.query.redirect) ? to.query.redirect[0] : to.query.redirect
      return next(isSafeInternalRedirect(intended) ? intended : '/')
    }

    // 🛑 Restrict by user ID
    if (to.meta.allowedUserIds && !to.meta.allowedUserIds.includes(auth.user?.id)) {
      return next('/') // or '/unauthorized'
    }

    next()
  })

  return Router
})
