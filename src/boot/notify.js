import { Notify } from 'quasar'

Notify.setDefaults({
    position: 'bottom',
    timeout: 4000,
    textColor: 'white',
    classes: 'snackbar-style', // hook if you want extra per-type overrides
    actions: [{ icon: 'close', color: 'white', round: true, dense: true }],
})
