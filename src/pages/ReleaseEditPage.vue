<template>
    <q-page class="q-pa-md release-edit-page">
        <div class="row items-center justify-between q-mb-lg">
            <div>
                <q-btn flat round icon="arrow_back" to="/releases" aria-label="Back to releases" />
                <span class="text-overline text-primary q-ml-sm">Release editor</span>
                <h1 class="text-h4 q-my-xs">{{ isNew ? 'New release' : (release.title || 'Untitled release') }}</h1>
            </div>
            <q-btn v-if="!isNew" color="positive" icon="publish" label="Publish" :loading="publishing"
                @click="publish" />
        </div>

        <q-card class="editor-card q-mb-md">
            <q-card-section>
                <div class="text-h6">Release details</div>
                <div class="row q-col-gutter-md q-mt-sm">
                    <q-input v-model="release.title" class="col-12 col-md-7" outlined label="Title" />
                    <q-file v-model="artCover" class="col-12 col-md-5" outlined label="Artwork" accept="image/*" />
                </div>
                <q-btn class="q-mt-md" color="primary" icon="save" label="Save release" :loading="saving"
                    @click="saveRelease" />
            </q-card-section>
        </q-card>

        <q-card v-if="!isNew" class="editor-card">
            <q-card-section>
                <div class="row items-center justify-between">
                    <div>
                        <div class="text-h6">Tracks</div>
                        <div class="text-caption text-grey-5">Add a track, then create its waveform.</div>
                    </div>
                    <q-badge color="grey-7">{{ tracks.length }} tracks</q-badge>
                </div>
                <q-btn class="q-mt-md" color="primary" icon="add" label="Add track" @click="trackDialog = true" />
            </q-card-section>
            <q-separator />
            <q-list separator>
                <q-item v-for="item in tracks" :key="item.id">
                    <q-item-section avatar><q-icon name="music_note" color="primary" /></q-item-section>
                    <q-item-section><q-item-label>{{ item.title }}</q-item-label><q-item-label caption>{{ item.file_name
                        || item.file_src }}</q-item-label></q-item-section>
                    <q-item-section side><q-badge :color="item.waveform ? 'positive' : 'warning'">{{ item.waveform ?
                        'Ready' : 'Waveform needed' }}</q-badge></q-item-section>
                    <q-item-section side><q-btn flat round icon="graphic_eq" color="primary"
                            :to="{ name: 'waveform', params: { id: item.id }, query: { release: release.id } }"
                            aria-label="Open waveform" /></q-item-section>
                </q-item>
                <q-item v-if="!tracks.length"><q-item-section class="text-grey-5">No tracks added
                        yet.</q-item-section></q-item>
            </q-list>
        </q-card>

        <q-dialog v-model="trackDialog" persistent>
            <q-card style="width: 620px; max-width: 95vw">
                <q-card-section class="row items-center justify-between">
                    <div class="text-h6">Add track</div>
                    <q-btn flat round icon="close" aria-label="Close" :disable="addingTrack" @click="cancelTrack" />
                </q-card-section>
                <q-form @submit.prevent="startTrackUpload">
                    <q-card-section class="row q-col-gutter-md">
                        <q-input v-model="track.title" class="col-12" outlined label="Track title" required />
                        <q-input v-model.number="track.price" class="col-6" outlined type="number" min="0" step="0.01"
                            label="Price" required />
                        <q-select v-model="track.genre_id" class="col-6" outlined label="Genre" :options="genres"
                            option-label="title" option-value="id" emit-value map-options required />
                        <div class="col-12">
                            <q-uploader ref="trackUploader" :url="uploadUrl" field-name="file_src"
                                accept="audio/mpeg,audio/wav,.mp3,.wav" :headers="uploaderHeaders"
                                :max-file-size="15024000" max-files="1" :auto-upload="false" hide-upload-btn
                                color="primary" class="full-width" @added="handleFileAdded"
                                @uploaded="handleUploadComplete" @failed="handleUploadFailed" />
                        </div>
                    </q-card-section>
                    <q-card-actions align="right">
                        <q-btn flat label="Cancel" :disable="addingTrack" @click="cancelTrack" />
                        <q-btn color="primary" type="submit" icon="upload" label="Upload track"
                            :loading="addingTrack" />
                    </q-card-actions>
                </q-form>
            </q-card>
        </q-dialog>
    </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { ApiService } from 'src/services/api'
import { releasesApi } from 'src/services/releases-api'
import { getApiPath } from 'src/boot/api-config'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const isNew = computed(() => route.name === 'release-create')
const release = reactive({ title: '', published: false })
const artCover = ref(null)
const tracks = ref([])
const genres = ref([])
const saving = ref(false)
const addingTrack = ref(false)
const trackDialog = ref(false)
const temporaryPath = ref(null)
const trackUploader = ref(null)
const fileSelected = ref(false)
const publishing = ref(false)
const track = reactive({ title: '', price: 0, genre_id: null, file_src: null })
const uploadUrl = `${getApiPath()}track-upload`
const uploaderHeaders = [{ name: 'Authorization', value: `Bearer ${localStorage.getItem('token') || ''}` }]

async function load() {
    if (!isNew.value) {
        Object.assign(release, await releasesApi.get(route.params.id))
        tracks.value = await releasesApi.tracks(route.params.id)
    }
    const { data } = await ApiService.get('genres')
    genres.value = data.data || data
}

async function saveRelease() {
    saving.value = true
    try {
        const form = new FormData()
        form.append('title', release.title)
        form.append('published', '0')
        if (artCover.value) form.append('art_cover', artCover.value)
        const saved = isNew.value ? await releasesApi.create(form) : await releasesApi.update(release.id, form)
        Object.assign(release, saved)
        if (isNew.value) await router.replace({ name: 'release-edit', params: { id: saved.id } })
        $q.notify({ type: 'positive', message: 'Release saved' })
    } catch (error) {
        $q.notify({ type: 'negative', message: error.response?.data?.message || 'Could not save release' })
    } finally { saving.value = false }
}

async function startTrackUpload() {
    if (!fileSelected.value) {
        $q.notify({ type: 'warning', message: 'Choose an audio file first' })
        return
    }
    addingTrack.value = true
    trackUploader.value?.upload()
}

function handleFileAdded(files) {
    track.file_src = files[0] || null
    fileSelected.value = files.length > 0
}

async function handleUploadComplete(info) {
    try {
        const xhr = info?.xhr || info
        const uploaded = JSON.parse(xhr.responseText)
        temporaryPath.value = uploaded.temp_path
        const added = await releasesApi.updateTrack({
            release_id: release.id,
            title: track.title,
            price: track.price,
            genre_id: track.genre_id,
            temp_path: uploaded.temp_path,
            file_name: uploaded.file_name,
        })
        tracks.value.unshift(added)
        Object.assign(track, { title: '', price: 0, genre_id: null, file_src: null })
        temporaryPath.value = null
        trackUploader.value?.reset()
        fileSelected.value = false
        trackDialog.value = false
        await router.push({ name: 'waveform', params: { id: added.id }, query: { release: release.id } })
    } catch (error) {
        $q.notify({ type: 'negative', message: error.response?.data?.message || 'Could not finish track upload' })
        await cancelTrack()
    } finally { addingTrack.value = false }
}

async function handleUploadFailed(info) {
    addingTrack.value = false
    let message = 'Could not upload track'
    try { message = JSON.parse(info?.xhr?.responseText || '{}').message || message } catch { message = 'Could not upload track' }
    $q.notify({ type: 'negative', message })
}

async function cancelTrack() {
    if (temporaryPath.value) {
        await releasesApi.revertUpload(temporaryPath.value)
        temporaryPath.value = null
    }
    Object.assign(track, { title: '', price: 0, genre_id: null, file_src: null })
    trackUploader.value?.reset()
    fileSelected.value = false
    trackDialog.value = false
}

async function publish() {
    publishing.value = true
    try {
        await ApiService.put(`releases/${release.id}`, { title: release.title, published: true })
        release.published = true
        $q.notify({ type: 'positive', message: 'Release published' })
    } catch (error) {
        $q.notify({ type: 'negative', message: error.response?.data?.message || 'Could not publish release' })
    } finally { publishing.value = false }
}

onMounted(load)
</script>

<style scoped>
.release-edit-page {
    max-width: 1100px;
    margin: 0 auto;
}

.editor-card {
    background: rgba(255, 255, 255, .06);
}
</style>
