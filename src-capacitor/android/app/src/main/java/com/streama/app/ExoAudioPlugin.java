package com.streama.app;

import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Wraps a single androidx.media3 ExoPlayer instance and exposes it to the
 * JS "session player" (see src/services/audio-engine.js) with the same
 * load/play/pause/seekTo/stop shape the web <audio> engine uses.
 *
 * One player instance lives for the whole app process, mirroring the JS
 * side's single shared player: there is one ExoPlayer, not one per page.
 *
 * Progress is pushed to JS on a timer via notifyListeners("progress", ...),
 * matching what the web engine's audio.ontimeupdate already sends.
 */
@CapacitorPlugin(name = "ExoAudioPlayer")
public class ExoAudioPlugin extends Plugin {

    private ExoPlayer player;
    private final Handler progressHandler = new Handler(Looper.getMainLooper());
    private static final long PROGRESS_INTERVAL_MS = 500;

    private final Runnable progressTick = new Runnable() {
        @Override
        public void run() {
            emitProgress();
            progressHandler.postDelayed(this, PROGRESS_INTERVAL_MS);
        }
    };

    @Override
    public void load() {
        // Capacitor lifecycle hook (not related to the JS "load" method).
        getActivity().runOnUiThread(this::ensurePlayer);
    }

    private void ensurePlayer() {
        if (player != null) return;

        player = new ExoPlayer.Builder(getContext()).build();

        player.addListener(new Player.Listener() {
            @Override
            public void onIsPlayingChanged(boolean isPlaying) {
                JSObject data = new JSObject();
                data.put("isPlaying", isPlaying);
                notifyListeners("playState", data);

                if (isPlaying) {
                    progressHandler.removeCallbacks(progressTick);
                    progressHandler.post(progressTick);
                } else {
                    progressHandler.removeCallbacks(progressTick);
                }
            }

            @Override
            public void onPlaybackStateChanged(int state) {
                if (state == Player.STATE_READY) {
                    JSObject data = new JSObject();
                    data.put("duration", Math.max(0, player.getDuration()) / 1000.0);
                    notifyListeners("loaded", data);
                } else if (state == Player.STATE_ENDED) {
                    notifyListeners("ended", new JSObject());
                }
            }

            @Override
            public void onPlayerError(PlaybackException error) {
                JSObject data = new JSObject();
                data.put("message", error.getMessage());
                notifyListeners("error", data);
            }
        });
    }

    private void emitProgress() {
        if (player == null) return;

        JSObject data = new JSObject();
        data.put("currentTime", Math.max(0, player.getCurrentPosition()) / 1000.0);
        data.put("duration", Math.max(0, player.getDuration()) / 1000.0);
        notifyListeners("progress", data);
    }

    @PluginMethod
    public void load(PluginCall call) {
        String src = call.getString("src");
        if (src == null || src.isEmpty()) {
            call.reject("src is required");
            return;
        }

        getActivity().runOnUiThread(() -> {
            ensurePlayer();
            player.setMediaItem(MediaItem.fromUri(Uri.parse(src)));
            player.prepare();
            call.resolve();
        });
    }

    @PluginMethod
    public void play(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            ensurePlayer();
            player.play();
            call.resolve();
        });
    }

    @PluginMethod
    public void pause(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (player != null) player.pause();
            call.resolve();
        });
    }

    @PluginMethod
    public void seekTo(PluginCall call) {
        Double percent = call.getDouble("percent");
        if (percent == null) {
            call.reject("percent is required");
            return;
        }

        getActivity().runOnUiThread(() -> {
            if (player != null && player.getDuration() > 0) {
                long target = (long) (percent * player.getDuration());
                player.seekTo(target);
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (player != null) {
                player.stop();
                player.clearMediaItems();
            }
            progressHandler.removeCallbacks(progressTick);
            call.resolve();
        });
    }

    @Override
    protected void handleOnDestroy() {
        progressHandler.removeCallbacks(progressTick);
        if (player != null) {
            player.release();
            player = null;
        }
    }
}
