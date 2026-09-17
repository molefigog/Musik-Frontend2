package com.streama.app;

import android.app.PendingIntent;
import android.content.Intent;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

/**
 * Owns the single ExoPlayer instance for the app and publishes it as a
 * MediaSession. Being a real (foreground) Service rather than living inside
 * an Activity/Plugin is what lets playback survive backgrounding and lets
 * the system draw a proper media notification.
 *
 * Once a MediaSession is attached to a MediaSessionService like this,
 * Android auto-generates the MediaStyle notification and keeps its
 * PlaybackState (including the seekbar's position/duration) in sync with
 * the player on its own — see
 * https://developer.android.com/media/implement/surfaces/mobile
 * "With Jetpack Media3 ... your PlaybackState is automatically kept
 * up-to-date with the media player ... the library automatically publishes
 * a MediaStyle notification for you and keeps it up-to-date."
 *
 * ExoAudioPlugin.java talks to this service through a MediaController; it
 * no longer holds an ExoPlayer of its own.
 */
public class PlaybackService extends MediaSessionService {

    private MediaSession mediaSession;

    @Override
    public void onCreate() {
        super.onCreate();

        ExoPlayer player = new ExoPlayer.Builder(this).build();

        // Tapping the notification or lock-screen art reopens the app.
        PendingIntent sessionActivity = PendingIntent.getActivity(
            this,
            0,
            new Intent(this, MainActivity.class),
            PendingIntent.FLAG_IMMUTABLE
        );

        mediaSession = new MediaSession.Builder(this, player)
            .setSessionActivity(sessionActivity)
            .build();
    }

    @Override
    public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }

    // If the user swipes the app away from recents while nothing is
    // actively playing, let the service (and its notification) go away
    // too, instead of lingering forever.
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Player player = mediaSession != null ? mediaSession.getPlayer() : null;
        if (player == null || !player.getPlayWhenReady() || player.getMediaItemCount() == 0) {
            stopSelf();
        }
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) {
            mediaSession.getPlayer().release();
            mediaSession.release();
            mediaSession = null;
        }
        super.onDestroy();
    }
}
