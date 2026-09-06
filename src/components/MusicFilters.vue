<template>
    <div class="wc-filter q-mb-md" :class="isDark ? 'theme-dark' : 'theme-light'">
        <!-- <div class="wc-filter-head">

            <div class="wc-filter-actions">
                <q-btn flat dense no-caps :icon="showFilters ? 'filter_list_off' : 'filter_list'"
                    :color="hasActiveFilters ? 'primary' : (isDark ? 'grey-4' : 'grey-7')"
                    @click="showFilters = !showFilters" />
                <q-btn flat dense no-caps icon="cancel" :color="isDark ? 'grey-4' : 'grey-7'" @click="resetFilters" />
            </div>
        </div> -->

        <div class="wc-filter-body">
            <div class="row items-center no-wrap q-gutter-x-sm">
                <q-btn flat dense no-caps :icon="showFilters ? 'filter_list_off' : 'filter_list'"
                    :color="hasActiveFilters ? 'primary' : (isDark ? 'grey-4' : 'grey-7')"
                    @click="showFilters = !showFilters" />

                <q-input v-model="local.search" outlined dense :dark="isDark" debounce="250"
                    placeholder="Search tracks, artists, albums" class="col">
                    <template #prepend>
                        <q-icon name="search" />
                    </template>
                </q-input>

                <q-btn flat dense no-caps icon="cancel" :color="isDark ? 'grey-4' : 'grey-7'" @click="resetFilters" />
            </div>

            <q-slide-transition>
                <div v-show="showFilters" class="q-mt-sm">
                    <div class="row q-col-gutter-sm items-start q-mb-sm">
                        <div class="col-12 col-sm-6 col-md-4">
                            <q-select v-model="local.genre" :options="genreOptions" label="Genre" outlined dense
                                :dark="isDark" clearable emit-value map-options />
                        </div>

                        <div class="col-12 col-sm-6 col-md-4">
                            <q-select v-model="local.release" :options="releaseOptions" label="Release" outlined dense
                                :dark="isDark" clearable emit-value map-options />
                        </div>

                        <div class="col-12 col-sm-6 col-md-4">
                            <q-select v-model="local.price" :options="priceOptions" label="Price" outlined dense
                                :dark="isDark" clearable emit-value map-options />
                        </div>
                    </div>

                    <div class="letter-strip">
                        <div v-for="l in letters" :key="l" class="letter-item" :class="{ active: local.letter === l }"
                            @click="toggleLetter(l)">
                            {{ l }}
                        </div>
                    </div>
                </div>
            </q-slide-transition>

            <div v-if="hasActiveFilters" class="active-row q-mt-sm">
                <q-chip v-if="local.search" dense removable @remove="local.search = ''">
                    Search: {{ local.search }}
                </q-chip>

                <q-chip v-if="local.genre" dense removable @remove="local.genre = null">
                    Genre: {{ genreLabel(local.genre) }}
                </q-chip>

                <q-chip v-if="local.release" dense removable @remove="local.release = null">
                    Release: {{ releaseLabel(local.release) }}
                </q-chip>

                <q-chip v-if="local.price" dense removable @remove="local.price = null">
                    Price: {{ local.price }}
                </q-chip>

                <q-chip v-if="local.letter" dense removable @remove="local.letter = null">
                    Starts: {{ local.letter }}
                </q-chip>
            </div>
        </div>
    </div>
</template>

<script setup>
import { watch, ref, computed, reactive } from 'vue'
import { useQuasar } from 'quasar'

const props = defineProps({
    filters: Object,
    genres: { type: Array, default: () => [] },
    releases: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:filters'])
const $q = useQuasar()
const isDark = computed(() => $q.dark.isActive)

const showFilters = ref(false)
const DEFAULT_FILTERS = {
    search: '',
    genre: null,
    release: null,
    price: null,
    letter: null
}

const local = reactive({ ...DEFAULT_FILTERS })

watch(
    () => props.filters,
    (next) => {
        Object.assign(local, DEFAULT_FILTERS, next || {})
    },
    { immediate: true, deep: true }
)

watch(
    local,
    (next) => {
        emit('update:filters', { ...next })
    },
    { deep: true }
)

const hasActiveFilters = computed(() =>
    !!(local.search || local.genre || local.release || local.price || local.letter)
)

function resetFilters() {
    Object.assign(local, {
        ...DEFAULT_FILTERS
    })
}

function toggleLetter(letter) {
    local.letter = local.letter === letter ? null : letter
}

/* REAL LABEL HELPERS (fix UX inconsistency) */
function genreLabel(id) {
    const match = props.genres.find(g => String(g.id) === String(id))
    return match?.name || match?.title || 'Unknown'
}

function releaseLabel(id) {
    const match = props.releases.find(r => String(r.id) === String(id))
    return match?.title || match?.name || 'Unknown'
}

const genreOptions = computed(() =>
    props.genres.map(g => ({
        label: g.name || g.title || 'Unknown',
        value: String(g.id)
    }))
)

const releaseOptions = computed(() =>
    props.releases.map(r => ({
        label: r.title || r.name || 'Unknown',
        value: String(r.id)
    }))
)

const priceOptions = [
    { label: 'Free', value: 'free' },
    { label: 'Paid', value: 'paid' }
]

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
</script>

<style scoped>
.wc-filter {
    border: 1px solid var(--mf-border);
    border-radius: 1px;
    box-shadow: 0 6px 18px var(--mf-shadow);
    color: var(--mf-text);
    background: var(--mf-bg);
    transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.theme-light {
    --mf-bg: #ffffff;
    --mf-border: #e5e7eb;
    --mf-head-border: #f1f5f9;
    --mf-text: #111827;
    --mf-muted: #374151;
    --mf-chip-bg: #f3f4f6;
    --mf-chip-text: #374151;
    --mf-letter-bg: #f8fafc;
    --mf-letter-border: #e5e7eb;
    --mf-letter-hover: #ffffff;
    --mf-letter-hover-border: #d1d5db;
    --mf-shadow: rgba(15, 23, 42, 0.06);
    --mf-field-bg: #ffffff;
}

.theme-dark {
    --mf-bg: rgba(10, 10, 15, 0.88);
    --mf-border: rgba(148, 163, 184, 0.24);
    --mf-head-border: rgba(148, 163, 184, 0.2);
    --mf-text: #e5e7eb;
    --mf-muted: #cbd5e1;
    --mf-chip-bg: rgba(71, 85, 105, 0.35);
    --mf-chip-text: #e2e8f0;
    --mf-letter-bg: rgba(51, 65, 85, 0.42);
    --mf-letter-border: rgba(148, 163, 184, 0.24);
    --mf-letter-hover: rgba(71, 85, 105, 0.58);
    --mf-letter-hover-border: rgba(148, 163, 184, 0.36);
    --mf-shadow: rgba(2, 6, 23, 0.4);
    --mf-field-bg: rgba(15, 23, 42, 0.66);
}

.wc-filter-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--mf-head-border);
}

.wc-filter-title {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: var(--mf-text);
}

.wc-filter-actions {
    display: flex;
    gap: 4px;
}

.wc-filter-body {
    padding: 14px;
}

.active-row {
    display: flex;
    gap: 0.45rem;
    flex-wrap: wrap;
}

.active-row :deep(.q-chip) {
    background: var(--mf-chip-bg);
    color: var(--mf-chip-text);
}

.wc-filter :deep(.q-field--outlined .q-field__control) {
    background: var(--mf-field-bg);
}

.wc-filter :deep(.q-field__native),
.wc-filter :deep(.q-field__input),
.wc-filter :deep(.q-field__label) {
    color: var(--mf-muted);
}

.letter-strip {
    display: flex;
    overflow-x: auto;
    gap: 0.4rem;
    padding: 0.25rem 0.1rem 0.15rem;
    scrollbar-width: none;
}

.letter-strip::-webkit-scrollbar {
    display: none;
}

.letter-item {
    min-width: 2rem;
    height: 2rem;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--mf-letter-bg);
    border: 1px solid var(--mf-letter-border);
    color: var(--mf-muted);
    cursor: pointer;
    transition: 0.2s;
    font-size: 0.72rem;
    font-weight: 600;
    flex-shrink: 0;
}

.letter-item:hover {
    border-color: var(--mf-letter-hover-border);
    background: var(--mf-letter-hover);
}

.letter-item.active {
    border-color: #1976d2;
    background: #1976d2;
    color: #ffffff;
}

@media (max-width: 600px) {
    .wc-filter-head {
        align-items: flex-start;
        flex-direction: column;
    }

    .wc-filter-body {
        padding: 12px;
    }

    .letter-item {
        min-width: 2rem;
        height: 2rem;
    }
}
</style>