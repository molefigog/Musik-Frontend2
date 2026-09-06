<template>
    <q-page class="q-pa-md releases-page">
        <div class="row items-center justify-between q-mb-lg">
            <div>
                <div class="text-overline text-primary">Creator studio</div>
                <h1 class="text-h4 q-my-xs">Releases</h1>
                <div class="text-grey-5">Build a release, add tracks, and publish when ready.</div>
            </div>
            <q-btn color="primary" icon="add" label="New release" :to="{ name: 'release-create' }" />
        </div>

        <q-inner-loading :showing="loading" />
        <div v-if="!loading && !releases.length" class="empty-state text-center q-pa-xl">
            <q-icon name="album" size="64px" color="grey-6" />
            <div class="text-h6 q-mt-md">No releases yet</div>
            <q-btn class="q-mt-md" outline color="primary" label="Create your first release"
                :to="{ name: 'release-create' }" />
        </div>
        <div v-else class="row q-col-gutter-md">
            <div v-for="release in releases" :key="release.id" class="col-12 col-sm-6 col-md-4">
                <q-card class="release-card">
                    <q-img :src="mediaUrl(release.art_cover)" ratio="1.7" />
                    <q-card-section>
                        <div class="row items-center justify-between">
                            <div class="text-h6 ellipsis">{{ release.title || 'Untitled release' }}</div>
                            <q-badge :color="release.published ? 'positive' : 'grey-7'">{{ release.published ?
                                'Published' : 'Draft' }}</q-badge>
                        </div>
                        <div class="text-caption text-grey-5 q-mt-xs">{{ formatDate(release.created_at) }}</div>
                    </q-card-section>
                    <q-card-actions align="right">
                        <q-btn flat color="primary" icon="edit" label="Edit"
                            :to="{ name: 'release-edit', params: { id: release.id } }" />
                    </q-card-actions>
                </q-card>
            </div>
        </div>
    </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { releasesApi, mediaUrl } from 'src/services/releases-api'

const $q = useQuasar()
const releases = ref([])
const loading = ref(false)

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : ''

async function load() {
    loading.value = true
    try {
        releases.value = await releasesApi.list()
    } catch {
        $q.notify({ type: 'negative', message: 'Could not load releases' })
    } finally {
        loading.value = false
    }
}

onMounted(load)
</script>

<style scoped>
.releases-page {
    max-width: 1180px;
    margin: 0 auto;
}

.release-card {
    overflow: hidden;
    background: rgba(255, 255, 255, .06);
}

.empty-state {
    border: 1px dashed rgba(255, 255, 255, .18);
    border-radius: 12px;
}
</style>
