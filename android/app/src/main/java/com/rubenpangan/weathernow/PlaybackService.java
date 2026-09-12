package com.rubenpangan.weathernow;

import android.content.Intent;
import android.net.Uri;
import androidx.annotation.Nullable;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;
import java.util.ArrayList;

public class PlaybackService extends MediaSessionService {
    public static final String ACTION_PLAYLIST = "weathernow.PLAYLIST";
    public static final String ACTION_PAUSE = "weathernow.PAUSE";
    public static final String ACTION_RESUME = "weathernow.RESUME";
    public static final String ACTION_NEXT = "weathernow.NEXT";
    public static final String ACTION_PREVIOUS = "weathernow.PREVIOUS";
    public static final String ACTION_SELECT = "weathernow.SELECT";
    public static final String ACTION_STOP = "weathernow.STOP";
    private ExoPlayer player;
    private MediaSession mediaSession;

    @Override public void onCreate() {
        super.onCreate();
        player = new ExoPlayer.Builder(this).build();
        player.setVolume(0.7f);
        mediaSession = new MediaSession.Builder(this, player).build();
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.getAction() != null) {
            switch (intent.getAction()) {
                case ACTION_PLAYLIST:
                    ArrayList<String> urls = intent.getStringArrayListExtra("urls");
                    ArrayList<String> names = intent.getStringArrayListExtra("names");
                    ArrayList<MediaItem> items = new ArrayList<>();
                    if (urls != null) for (int i = 0; i < urls.size(); i++) {
                        String title = names != null && i < names.size() ? names.get(i) : "WeatherNow audio";
                        items.add(new MediaItem.Builder().setUri(Uri.parse(urls.get(i)))
                            .setMediaMetadata(new MediaMetadata.Builder().setTitle(title).setArtist("WeatherNow").build()).build());
                    }
                    player.setMediaItems(items, Math.max(0, intent.getIntExtra("index", 0)), 0L);
                    player.prepare();
                    player.play();
                    break;
                case ACTION_PAUSE: player.pause(); break;
                case ACTION_RESUME: player.play(); break;
                case ACTION_NEXT: if (player.hasNextMediaItem()) player.seekToNextMediaItem(); break;
                case ACTION_PREVIOUS: if (player.hasPreviousMediaItem()) player.seekToPreviousMediaItem(); else player.seekTo(0); break;
                case ACTION_SELECT: player.seekToDefaultPosition(Math.max(0, intent.getIntExtra("index", 0))); player.play(); break;
                case ACTION_STOP: player.stop(); player.clearMediaItems(); stopSelf(); break;
            }
        }
        return super.onStartCommand(intent, flags, startId);
    }

    @Nullable @Override public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) { return mediaSession; }

    @Override public void onDestroy() {
        mediaSession.release();
        player.release();
        super.onDestroy();
    }
}
