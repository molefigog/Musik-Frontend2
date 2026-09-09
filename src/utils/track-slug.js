// Builds and parses a "pretty" URL segment for a track, e.g.
//   /music/midnight-vibes-6f
// instead of exposing the raw sequential database id, e.g. /music/5
//
// This does NOT require a `slug` column in the DB — it derives a readable
// slug from the track title on the fly, and hides the numeric id behind a
// simple reversible offset + base36 encoding so it isn't shown to users as
// a plain incrementing number. It is obfuscation, not real security — treat
// it the same as before for anything that actually needs access control.

// Change this if you want a different obfuscation "key". Keep it stable
// once deployed, or previously-shared links will stop resolving.
const ID_OFFSET = 104729 // arbitrary prime, purely to stop the id from being a small obvious integer

export function slugify(text = '') {
    return (
        String(text)
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60) || 'track'
    )
}

export function encodeTrackId(id) {
    const n = Number(id)
    if (!Number.isFinite(n)) return String(id)
    return (n + ID_OFFSET).toString(36)
}

export function decodeTrackId(code) {
    const n = parseInt(code, 36)
    if (!Number.isFinite(n)) return null
    return n - ID_OFFSET
}

// Full slug for a track object, e.g. "midnight-vibes-6f"
export function buildTrackSlug(track) {
    if (!track?.id) return ''
    return `${slugify(track.title)}-${encodeTrackId(track.id)}`
}

// Pulls the real numeric id back out of a route param like "midnight-vibes-6f"
export function parseTrackSlug(slug) {
    const parts = String(slug || '').split('-')
    const code = parts[parts.length - 1]
    return decodeTrackId(code)
}
