// src/stores/visibilityStore.js
import { reactive } from 'vue'

const keys = [
  'showPOS',
  'showQuote',
  'showQuoteList',
  'showStock',
  'showSales',
  'showCollection',
  'showCollections'
]

const visibility = reactive({})

keys.forEach(key => {
  const stored = localStorage.getItem(key)
  visibility[key] = stored !== null ? JSON.parse(stored) : true
})

export function setVisibility(key, value) {
  visibility[key] = value
  localStorage.setItem(key, JSON.stringify(value))
}

export default visibility
