const routes = [
    {
        path: '/',
        component: () => import('src/layouts/MainLayout.vue'),
        children: [
            // {
            //   path: '',
            //   name: 'Home',
            //   meta: { title: 'Home', requiresAuth: true },
            //   component: () => import('pages/pos/PosPage.vue'),
            // },
            {
                path: '',
                name: 'Home',
                meta: { title: 'Home' },
                component: () => import('pages/IndexPage.vue'),
            },
            {
                path: '/tasks',
                name: 'Task',
                meta: { title: 'Task', requiresAuth: true },
                component: () => import('pages/TasksPage.vue'),
            },
            {
                path: '/music/:id',
                name: 'Track',
                meta: { title: 'Track' },
                component: () => import('pages/SongDetails.vue'),
            },
            {
                path: '/releases',
                name: 'releases',
                meta: { title: 'Releases', requiresAuth: true },
                component: () => import('pages/ReleasesPage.vue'),
            },
            {
                path: '/releases/create',
                name: 'release-create',
                meta: { title: 'New Release', requiresAuth: true },
                component: () => import('pages/ReleaseEditPage.vue'),
            },
            {
                path: '/releases/:id/edit',
                name: 'release-edit',
                meta: { title: 'Edit Release', requiresAuth: true },
                component: () => import('pages/ReleaseEditPage.vue'),
            },
            {
                path: '/music/:id/waveform',
                name: 'waveform',
                meta: { title: 'Track Waveform', requiresAuth: true },
                component: () => import('pages/WaveformPage.vue'),
            },
            {
                path: '/services/:id',
                name: 'service-checkout',
                meta: { title: 'Service Checkout', requiresAuth: true },
                component: () => import('pages/ServicesCheckout.vue'),
            },
            {
                path: '/cart',
                name: 'cart-checkout',
                meta: { title: 'Cart Checkout', requiresAuth: true },
                component: () => import('pages/CartCheckout.vue'),
            },
            {
                path: '/Payment',
                name: 'Payment',
                meta: { title: 'Payment', requiresAuth: true },
                component: () => import('pages/PaymentsPage.vue'),
            },
            {
                path: '/paypal/result',
                component: () => import('pages/PaypalResult.vue'),
            },
            {
                path: '/card/result',
                component: () => import('pages/CardResult.vue'),
            },

            {
                path: '/login',
                component: () => import('pages/auth/LoginPage.vue'),
                meta: { requiresAuth: false },
            },
            {
                path: '/register',
                component: () => import('pages/auth/RegisterPage.vue'),
                meta: { requiresAuth: false },
            },
            {
                path: '/profile',
                component: () => import('pages/auth/ProfilePage.vue'),
                meta: { requiresAuth: true },
            },
            {
                path: '/downloads',
                name: 'downloads',
                meta: { title: 'Downloads', requiresAuth: true },
                component: () => import('pages/DownloadsPage.vue'),
            },
            {
                path: '/settings',
                name: 'settings',
                meta: { title: 'Settings', requiresAuth: true },
                component: () => import('pages/SettingsPage.vue'),
            },
            {
                path: '/notifications',
                name: 'notifications-inbox',
                meta: { title: 'Notifications', requiresAuth: true },
                component: () => import('pages/NotificationsInboxPage.vue'),
            },
        ],
    },
    {
        path: '/:catchAll(.*)*',
        component: () => import('pages/ErrorNotFound.vue'),
    },
]

export default routes
