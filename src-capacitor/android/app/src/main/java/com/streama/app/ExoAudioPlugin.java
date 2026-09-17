package com.streama.app;

import android.content.ComponentName;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.session.MediaController;
import androidx.media3.session.SessionToken;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.common.util.concurrent.MoreExecutors;

/**
 * JS-facing wrapper (src/services/audio-engine.js) around PlaybackService's
 * MediaSession. This plugin does NOT own an ExoPlayer itself anymore — it
 * connects to the one living in PlaybackService via a MediaController, so
 * play/pause/seek here are really just remote calls to that session. That's
 * what lets the system draw a real media notification with a working
 * seekbar and lets playback survive the app backgrounding.
 */
@CapacitorPlugin(name = "ExoAudioPlayer")
public class ExoAudioPlugin extends Plugin {

    private MediaController controller;
    private ListenableFuture<MediaController> controllerFuture;
    private final Handler progressHandler = new Handler(Looper.getMainLooper());
    private static final long PROGRESS_INTERVAL_MS = 500;

    // A load() call from JS that arrived before the controller finished
    // connecting gets replayed once it has.
    private String pendingSrc;
    private PluginCall pendingLoadCall;

    private final Runnable progressTick = new Runnable() {
        @Override
        public void run() {
            emitProgress();
            progressHandler.postDelayed(this, PROGRESS_INTERVAL_MS);
        }
    };

    @Override
    public void load() {
        // Capacitor lifecycle hook (not related to the JS "load" method
        // below) — connect to PlaybackService's MediaSession as soon as the
        // plugin is loaded by the bridge.
        SessionToken token = new SessionToken(
            getContext(),
            new ComponentName(getContext(), PlaybackService.class)
        );
        controllerFuture = new MediaController.Builder(getContext(), token).buildAsync();
        controllerFuture.addListener(this::onControllerConnected, MoreExecutors.directExecutor());
    }

    private void onControllerConnected() {
        try {
            controller = controllerFuture.get();
        } catch (Exception e) {
            return;
        }

        controller.addListener(new Player.Listener() {
            @Override
            public void onIsPlayingChanged(boolean isPlaying) {
                JSObject data = new JSObject();
                data.put("isPlaying", isPlaying);
                notifyListeners("playState", data);

                progressHandler.removeCallbacks(progressTick);
                if (isPlaying) {
                    progressHandler.post(progressTick);
                }
            }

            @Override
            public void onPlaybackStateChanged(int state) {
                if (state == Player.STATE_READY) {
                    JSObject data = new JSObject();
                    data.put("duration", Math.max(0, controller.getDuration()) / 1000.0);
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

        if (pendingLoadCall != null && pendingSrc != null) {
            doLoad(pendingSrc, pendingLoadCall);
            pendingSrc = null;
            pendingLoadCall = null;
        }
    }

    private void emitProgress() {
        if (controller == null) return;

        JSObject data = new JSObject();
        data.put("currentTime", Math.max(0, controller.getCurrentPosition()) / 1000.0);
        data.put("duration", Math.max(0, controller.getDuration()) / 1000.0);
        notifyListeners("progress", data);
    }

    private void doLoad(String src, PluginCall call) {
        controller.setMediaItem(MediaItem.fromUri(Uri.parse(src)));
        controller.prepare();
        call.resolve();
    }

    @PluginMethod
    public void load(PluginCall call) {
        String src = call.getString("src");
        if (src == null || src.isEmpty()) {
            call.reject("src is required");
            return;
        }

        getActivity().runOnUiThread(() -> {
            if (controller == null) {
                pendingSrc = src;
                pendingLoadCall = call;
                return;
            }
            doLoad(src, call);
        });
    }

    @PluginMethod
    public void play(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (controller != null) controller.play();
            call.resolve();
        });
    }

    @PluginMethod
    public void pause(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (controller != null) controller.pause();
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
            if (controller != null && controller.getDuration() > 0) {
                long target = (long) (percent * controller.getDuration());
                controller.seekTo(target);
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (controller != null) {
                controller.stop();
                controller.clearMediaItems();
            }
            progressHandler.removeCallbacks(progressTick);
            call.resolve();
        });
    }

    @Override
    protected void handleOnDestroy() {
        progressHandler.removeCallbacks(progressTick);
        if (controllerFuture != null) {
            MediaController.releaseFuture(controllerFuture);
        }
    }
}
