// src/stores/cart.js
//
// Requires: npm install @capacitor/preferences
//
// Call `await useCartStore().load()` once on app boot (e.g. in App.vue's
// onMounted, or a boot file) so a persisted cart is restored before any
// page tries to read it.

import { defineStore } from 'pinia'
import { Preferences } from '@capacitor/preferences'

const STORAGE_KEY = 'cart_v1'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],       // [{ id, name, price, quantity }]
    itemType: null,  // 'service' | 'music' - locks the cart to one category
    ready: false,    // true once the persisted cart has been loaded
  }),

  getters: {
    count: (state) => state.items.reduce((sum, item) => sum + item.quantity, 0),
    total: (state) => state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    isEmpty: (state) => state.items.length === 0,
    itemIds: (state) => state.items.map((item) => item.id),
  },

  actions: {
    async load() {
      try {
        const { value } = await Preferences.get({ key: STORAGE_KEY })

        if (value) {
          const parsed = JSON.parse(value)
          this.items = parsed.items ?? []
          this.itemType = parsed.itemType ?? null
        }
      } catch (error) {
        console.log('Cart: failed to load persisted cart', error)
      } finally {
        this.ready = true
      }
    },

    async persist() {
      try {
        await Preferences.set({
          key: STORAGE_KEY,
          value: JSON.stringify({ items: this.items, itemType: this.itemType }),
        })
      } catch (error) {
        console.log('Cart: failed to persist cart', error)
      }
    },

    /**
     * Adds one of `item` to the cart. Returns false and changes nothing if
     * `itemType` conflicts with what's already in the cart - the calling
     * page decides what to do with that (e.g. confirm dialog, then call
     * replaceWith to swap the cart over to the new type).
     */
    addItem(item, itemType) {
      const resolvedType = itemType || item?.type || this.itemType

      if (!this.isEmpty && this.itemType && this.itemType !== resolvedType) {
        return false
      }

      this.itemType = resolvedType

      const existing = this.items.find((i) => String(i.id) === String(item.id))

      if (existing) {
        existing.quantity += 1
      } else {
        this.items.push({
          id: item.id,
          name: item.name,
          price: item.price,
          service_type: item.service_type,
          quantity: 1,
        })
      }

      this.persist()
      return true
    },

    replaceWith(item, itemType) {
      const resolvedType = itemType || item?.type || this.itemType
      this.items = [{
        id: item.id,
        name: item.name,
        price: item.price,
        service_type: item.service_type,
        quantity: 1,
      }]
      this.itemType = resolvedType
      this.persist()
    },

    removeItem(id) {
      this.items = this.items.filter((item) => item.id !== id)
      if (this.items.length === 0) this.itemType = null
      this.persist()
    },

    setQuantity(id, quantity) {
      const item = this.items.find((i) => i.id === id)
      if (!item) return

      if (quantity <= 0) {
        this.removeItem(id)
        return
      }

      item.quantity = quantity
      this.persist()
    },

    clear() {
      this.items = []
      this.itemType = null
      this.persist()
    },
  },
})
