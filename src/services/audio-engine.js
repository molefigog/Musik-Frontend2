import { Capacitor } from '@capacitor/core'
import { registerPlugin } from '@capacitor/core'

// Native Capacitor plugin implemented in
// src-capacitor/android/app/src/main/java/com/streama/app/ExoAudioPlugin.java
// It's registered here unconditionally (cheap/no-op on web and iOS) so the
// import graph doesn't need platform-specific branches.
const ExoAudioPlayer = registerPlugin('ExoAudioPlayer')

/**
 * Both engines expose the same shape:
 *   load(src)        -> Promise<void>   loads a new source, does not start playback
 *   play()            -> Promise<void>
 *   pause()           -> Promise<void> | void
 *   seekTo(percent)   -> void            percent is 0..1 of duration
 *   stop()            -> void            pause + reset position + clear source
 *
 * And they report state back exclusively through the callbacks passed in —
 * AudioPlayer.vue never reaches into either engine's internals.
 */
export function createAudioEngine({ onTimeUpdate, onLoadedMetadata, onEnded, onPlayState }) {
    const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

    return isAndroidNative
        ? createNativeExoEngine({ onTimeUpdate, onLoadedMetadata, onEnded, onPlayState })
        : createWebAudioEngine({ onTimeUpdate, onLoadedMetadata, onEnded, onPlayState })
}

function createWebAudioEngine({ onTimeUpdate, onLoadedMetadata, onEnded, onPlayState }) {
    const audio = new Audio()

    audio.ontimeupdate = () => {
        if (audio.duration) {
            onTimeUpdate({
                currentTime: audio.currentTime,
                duration: audio.duration,
                progress: audio.currentTime / audio.duration,
            })
        }
    }
    audio.onloadedmetadata = () => onLoadedMetadata(audio.duration)
    audio.onended = () => onEnded()
    audio.onplay = () => onPlayState(true)
    audio.onpause = () => onPlayState(false)

    return {
        async load(src) {
            audio.src = src
        },
        async play() {
            await audio.play()
        },
        async pause() {
            audio.pause()
        },
        seekTo(percent) {
            if (!audio.duration) return
            audio.currentTime = percent * audio.duration
        },
        stop() {
            audio.pause()
            audio.currentTime = 0
            audio.src = ''
        },
    }
}

function createNativeExoEngine({ onTimeUpdate, onLoadedMetadata, onEnded, onPlayState }) {
    let lastDuration = 0

    // Payloads match ExoAudioPlugin.java's notifyListeners(...) calls.
    ExoAudioPlayer.addListener('progress', ({ currentTime = 0, duration = 0 }) => {
        lastDuration = duration || lastDuration
        onTimeUpdate({
            currentTime,
            duration,
            progress: duration ? currentTime / duration : 0,
        })
    })

    ExoAudioPlayer.addListener('loaded', ({ duration = 0 }) => {
        lastDuration = duration
        onLoadedMetadata(duration)
    })

    ExoAudioPlayer.addListener('ended', () => onEnded())
    ExoAudioPlayer.addListener('playState', ({ isPlaying }) => onPlayState(!!isPlaying))

    return {
        async load(src) {
            lastDuration = 0
            await ExoAudioPlayer.load({ src })
        },
        async play() {
            await ExoAudioPlayer.play()
        },
        async pause() {
            await ExoAudioPlayer.pause()
        },
        seekTo(percent) {
            ExoAudioPlayer.seekTo({ percent })
        },
        stop() {
            ExoAudioPlayer.stop()
        },
    }
}
