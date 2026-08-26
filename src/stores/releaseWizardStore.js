// stores/releaseWizardStore.js
import { defineStore } from 'pinia'

export const useReleaseWizardStore = defineStore('releaseWizard', {
  state: () => ({
    release: null,
    tracks: [],
    step: 1,
    loading: false,
    autosaveTimer: null,
  }),

  actions: {
    setRelease(data) {
      this.release = data
    },

    setTracks(tracks) {
      this.tracks = tracks
    },

    setStep(step) {
      this.step = step
    },
  },
})
