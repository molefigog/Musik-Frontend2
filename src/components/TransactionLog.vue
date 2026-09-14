<template>
    <q-page padding>

        <q-timeline color="primary">

            <q-timeline-entry v-for="payment in paginatedPayments" :key="payment.id" :title="payment.type.toUpperCase()"
                :subtitle="formatDate(payment.created_at)" :icon="paymentIcon(payment.status)"
                :color="paymentColor(payment.status)">

                <q-card flat bordered>

                    <q-card-section>

                        <div class="row items-center justify-between">

                            <div>
                                <div class="text-subtitle1">
                                    M{{ payment.amount }}
                                </div>

                                <div class="text-caption text-grey-5">
                                    Payment #{{ payment.payment_id || payment.id }} · Item #{{ payment.item_id || 'N/A'
                                    }}
                                </div>

                                <div class="text-body2">
                                    {{ payment.item_name || payment.description || 'Purchased item' }}
                                </div>

                                <div class="text-caption text-grey-5 q-mt-xs">
                                    Transaction ID: {{ payment.txn_id }}
                                </div>
                            </div>

                            <q-badge :color="paymentColor(payment.status)" class="text-uppercase">
                                {{ payment.status }}
                            </q-badge>

                        </div>

                    </q-card-section>

                </q-card>

            </q-timeline-entry>

        </q-timeline>

        <div v-if="totalPages > 1" class="row justify-center q-mt-lg">
            <q-pagination v-model="currentPage" :max="totalPages" boundary-numbers />
        </div>

    </q-page>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const recordsPerPage = 10
const currentPage = ref(1)

const props = defineProps({
    payments: {
        type: Array,
        default: () => []
    }
})

const sortedPayments = computed(() => {
    return [...props.payments].sort((a, b) => b.id - a.id)
})

const totalPages = computed(() => Math.ceil(sortedPayments.value.length / recordsPerPage))

const paginatedPayments = computed(() => {
    const start = (currentPage.value - 1) * recordsPerPage
    return sortedPayments.value.slice(start, start + recordsPerPage)
})

watch(totalPages, (pageCount) => {
    if (currentPage.value > pageCount) {
        currentPage.value = Math.max(pageCount, 1)
    }
})

const paymentColor = (status) => {
    switch (status) {
        case 'completed':
            return 'positive'

        case 'pending':
            return 'warning'

        case 'failed':
            return 'negative'

        default:
            return 'grey'
    }
}

const paymentIcon = (status) => {
    switch (status) {
        case 'completed':
            return 'check_circle'

        case 'pending':
            return 'schedule'

        case 'failed':
            return 'cancel'

        default:
            return 'payments'
    }
}

const formatDate = (date) => {
    return new Date(date).toLocaleString()
}
</script>
