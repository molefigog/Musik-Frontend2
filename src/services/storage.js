import store from 'store2'

const myAppStoreKey = process.env.STORAGE_KEY || 'APP'
const TOKEN_KEY = myAppStoreKey + '_TOKEN'
const LOCALE_KEY = myAppStoreKey + '_LOCALE'

export const StorageService = {
  setLocale(locale) {
    store.local.set(LOCALE_KEY, locale)
  },
  getLocale() {
    return store.local.get(LOCALE_KEY)
  },
  getToken() {
    return store.session.get(TOKEN_KEY) || store.local.get(TOKEN_KEY)
  },
  saveLoginData(loginData) {
    store.local.set(TOKEN_KEY, loginData.token)
  },
  removeLoginData() {
    store.session.remove(TOKEN_KEY)
    store.local.remove(TOKEN_KEY)
    // store.local.remove(LOCALE_KEY); // Uncomment if you want to clear locale on logout
  },
}
