// Dummy data for local development - matches the shape ServicesCheckoutPage.vue
// expects from `v1/services/:id` (id, name, price are required; the rest are
// extras for a services listing/grid page, drop them if you don't need them).
//
// Usage during dev, e.g. inside ServicesCheckoutPage.vue's fetchService():
//   import { dummyServices } from 'src/data/services'
//   service.value = dummyServices.find(s => s.id === Number(route.params.id))

export const dummyServices = [
    {
        id: 1,
        name: 'Mixing & Mastering',
        description: 'Professional mix and master for a single track, delivered in 3-5 days.',
        price: 350,
        duration_minutes: 60,
        icon: 'graphic_eq',
    },
    {
        id: 2,
        name: 'Vocal Recording Session',
        description: 'Studio time with an engineer for a full vocal recording session.',
        price: 450,
        duration_minutes: 90,
        icon: 'mic',
    },
    {
        id: 3,
        name: 'Beat Production',
        description: 'Custom instrumental produced to your brief, with two free revisions.',
        price: 600,
        duration_minutes: 120,
        icon: 'piano',
    },
    {
        id: 4,
        name: 'Music Distribution',
        description: 'Get your single or album onto major streaming platforms.',
        price: 200,
        duration_minutes: null,
        icon: 'cloud_upload',
    },
    {
        id: 5,
        name: 'Album Artwork Design',
        description: 'Custom cover art sized for streaming platforms and physical release.',
        price: 250,
        duration_minutes: null,
        icon: 'palette',
    },
    {
        id: 6,
        name: 'Songwriting Consultation',
        description: 'One-on-one session to develop lyrics, structure, and melody ideas.',
        price: 300,
        duration_minutes: 60,
        icon: 'edit_note',
    },
]
