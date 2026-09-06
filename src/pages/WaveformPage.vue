<template>
    <q-page class="q-pa-md waveform-page">
        <div class="row items-center q-mb-lg">
            <q-btn flat round icon="arrow_back" :to="{ name: 'release-edit', params: { id: releaseId } }"
                aria-label="Back to release" />
            <div class="q-ml-sm">
                <div class="text-overline text-primary">Track processing</div>
                <h1 class="text-h4 q-my-xs">{{ music.title || 'Waveform' }}</h1>
            </div>
        </div>
        <q-card flat bordered class="wave-card">
            <q-card-section>
                <div class="text-subtitle1">Waveform preview</div>
                <div v-if="generating" class="q-mt-md">
                    <q-linear-progress :value="generationProgress / 100" :indeterminate="isNativeAndroid"
                        color="primary" rounded />
                    <div class="text-caption text-grey-5 q-mt-xs">Generating waveform {{ generationProgress }}%</div>
                </div>
                <div v-if="isNativeAndroid" ref="waveform" class="wave-canvas" />
                <canvas v-else ref="canvas" class="wave-canvas" width="1200" height="260" />
                <audio class="wave-audio" controls controlslist="nodownload noplaybackrate" :src="audioUrl"
                    preload="metadata" />
            </q-card-section>
            <q-card-actions align="between">
                <q-toggle v-model="published" label="Publish track" />
                <q-btn color="primary" icon="save" label="Save & return" :loading="saving" :disable="generating"
                    @click="save" />
            </q-card-actions>
        </q-card>
    </q-page>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { Capacitor } from '@capacitor/core'
import { releasesApi } from 'src/services/releases-api'
import { getApiPath } from 'boot/api-config'
import WaveSurfer from 'wavesurfer.js'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const canvas = ref(null)
const waveform = ref(null)
const waveSurfer = ref(null)
const music = ref({})
const published = ref(true)
const saving = ref(false)
const generating = ref(false)
const generationProgress = ref(0)
const releaseId = route.query.release
const audioUrl = ref('')
const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

async function loadAudioSource(musicId) {
    const response = await fetch(`${getApiPath()}music/${musicId}/audio`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
    })
    if (!response.ok) throw new Error(`Audio request failed with status ${response.status}`)

    audioUrl.value = URL.createObjectURL(await response.blob())
}

async function drawWaveform() {
    generating.value = true
    generationProgress.value = 0
    const response = await fetch(audioUrl.value)
    const buffer = await response.arrayBuffer()
    const context = new AudioContext()
    const audio = await context.decodeAudioData(buffer)
    const values = audio.getChannelData(0)
    const context2d = canvas.value.getContext('2d')
    const width = canvas.value.width
    const height = canvas.value.height
    context2d.clearRect(0, 0, width, height)
    context2d.fillStyle = '#111827'
    context2d.fillRect(0, 0, width, height)
    context2d.strokeStyle = '#38bdf8'
    context2d.lineWidth = 2
    context2d.beginPath()
    const step = Math.ceil(values.length / width)
    for (let x = 0; x < width; x += 1) {
        let peak = 0
        for (let index = x * step; index < Math.min((x + 1) * step, values.length); index += 1) peak = Math.max(peak, Math.abs(values[index]))
        const amplitude = Math.max(2, peak * (height * 0.42))
        context2d.moveTo(x, height / 2 - amplitude)
        context2d.lineTo(x, height / 2 + amplitude)
        if (x % 20 === 0 || x === width - 1) {
            generationProgress.value = Math.round(((x + 1) / width) * 100)
            await new Promise((resolve) => requestAnimationFrame(resolve))
        }
    }
    context2d.stroke()
    await context.close()
    generating.value = false
}

async function drawAndroidWaveform() {
    generating.value = true
    generationProgress.value = 0
    waveSurfer.value = WaveSurfer.create({
        container: waveform.value,
        url: audioUrl.value,
        height: 260,
        waveColor: '#38bdf8',
        progressColor: '#0284c7',
        cursorColor: '#f8fafc',
        barWidth: 2,
        barGap: 1,
        normalize: true,
    })
    waveSurfer.value.on('redraw', () => { generationProgress.value = 100 })
    waveSurfer.value.on('ready', () => {
        generationProgress.value = 100
        generating.value = false
    })
    waveSurfer.value.on('error', () => { generating.value = false })
}

async function load() {
    try {
        music.value = await fetchMusic()
        await loadAudioSource(music.value.id)
        await nextTick()
        if (isNativeAndroid) {
            await drawAndroidWaveform()
        } else {
            await drawWaveform()
        }
    } catch {
        generating.value = false
        $q.notify({ type: 'negative', message: 'Could not load track audio' })
    }
}

async function fetchMusic() {
    const response = await fetch(`${getApiPath()}music/${route.params.id}`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
    })
    if (!response.ok) throw new Error(`Track request failed with status ${response.status}`)

    const body = await response.json()
    return body.data || body
}

async function save() {
    saving.value = true
    try {
        const source = isNativeAndroid ? waveform.value.querySelector('canvas') : canvas.value
        const blob = await new Promise((resolve) => source.toBlob(resolve, 'image/png'))
        const result = await releasesApi.saveWaveform(music.value.id, blob, published.value)
        await router.push({ name: 'release-edit', params: { id: result.release_id || releaseId } })
    } catch (error) {
        $q.notify({ type: 'negative', message: error.response?.data?.message || 'Could not save waveform' })
    } finally { saving.value = false }
}

onMounted(load)
onBeforeUnmount(() => {
    waveSurfer.value?.destroy()
    if (audioUrl.value.startsWith('blob:')) URL.revokeObjectURL(audioUrl.value)
})
</script>

<style scoped>
.waveform-page {
    max-width: 1100px;
    margin: 0 auto;
}

.wave-card {
    background: rgba(255, 255, 255, .06);
}

.wave-canvas {
    display: block;
    width: 100%;
    height: 260px;
    margin-top: 18px;
    border-radius: 8px;
}

.wave-audio {
    display: block;
    width: 100%;
    height: 42px;
    margin-top: 18px;
    border: 1px solid rgba(255, 255, 255, .1);
    border-radius: 8px;
    background: rgba(255, 255, 255, .04);
    accent-color: var(--q-primary);
}
</style>
