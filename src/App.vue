<template>
    <div v-if="!isOnline" class="offline-banner">
        No internet
    </div>
    <q-pull-to-refresh @refresh="onRefresh">
        <router-view />
    </q-pull-to-refresh>
</template>


<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useCartStore } from 'src/stores/cart'

const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)

const updateOnlineStatus = () => {
    isOnline.value = navigator.onLine
}

const onRefresh = async (done) => {
    try {
        await useCartStore().load()
         window.location.reload()
    } catch (e) {
        console.error('Pull to refresh failed', e)
    } finally {
        done()
    }
}

onMounted(() => {
    useCartStore().load()
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
})

onBeforeUnmount(() => {
    window.removeEventListener('online', updateOnlineStatus)
    window.removeEventListener('offline', updateOnlineStatus)
})
</script>
<style lang="css">
/* @import "./assets/custom-style.css"; */

.offline-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 9999;
    padding: 10px 16px;
    background: #3e46967e;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    text-align: center;
}
</style>