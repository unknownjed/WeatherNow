package com.rubenpangan.weathernow;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import java.util.Locale;

public class NativeSpeechService extends Service implements TextToSpeech.OnInitListener {
    public static final String ACTION_SPEAK = "weathernow.SPEAK";
    public static final String ACTION_STOP = "weathernow.STOP_SPEECH";
    public static final String ACTION_WARMUP = "weathernow.WARMUP_SPEECH";
    private static final String CHANNEL = "weathernow_forecaster";
    private static volatile NativeSpeechService activeInstance;
    private TextToSpeech tts;
    private String pendingText;
    private String pendingLanguage = "en-US";
    private float pendingRate = 1.05f;
    private float pendingPitch = 1.1f;

    @Override public void onCreate() {
        super.onCreate();
        activeInstance = this;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL, "WeatherNow Forecaster", NotificationManager.IMPORTANCE_LOW);
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
        tts = new TextToSpeech(this, this);
        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override public void onStart(String id) {}
            @Override public void onDone(String id) { stopForeground(true); stopSelf(); }
            @Override public void onError(String id) { stopForeground(true); stopSelf(); }
        });
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_WARMUP.equals(intent.getAction())) return START_NOT_STICKY;
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopSpeechNow();
            return START_NOT_STICKY;
        }
        if (intent != null) {
            pendingText = intent.getStringExtra("text");
            pendingLanguage = intent.getStringExtra("language");
            pendingRate = intent.getFloatExtra("rate", 1.05f);
            pendingPitch = intent.getFloatExtra("pitch", 1.1f);
        }
        startForeground(2002, new NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.mipmap.ic_launcher).setContentTitle("WeatherNow Forecaster")
            .setContentText("Speaking the current weather forecast").setOngoing(true).build());
        speakIfReady();
        return START_NOT_STICKY;
    }

    public static boolean stopActiveSpeech() {
        NativeSpeechService service = activeInstance;
        if (service == null) return false;
        service.stopSpeechNow();
        return true;
    }

    private void stopSpeechNow() {
        // Clear queued/pending speech first so a late TTS initialization callback
        // cannot start the forecast again after the user resumes music.
        pendingText = null;
        if (tts != null) tts.stop();
        stopForeground(true);
        stopSelf();
    }

    @Override public void onInit(int status) { if (status == TextToSpeech.SUCCESS) speakIfReady(); }
    private void speakIfReady() {
        if (tts == null || pendingText == null || pendingText.isEmpty()) return;
        tts.setLanguage(Locale.forLanguageTag(pendingLanguage == null ? "en-US" : pendingLanguage));
        tts.setSpeechRate(pendingRate); tts.setPitch(pendingPitch);
        String text = pendingText; pendingText = null;
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "weathernow-forecast");
    }
    @Override public void onDestroy() {
        pendingText = null;
        if (activeInstance == this) activeInstance = null;
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
        super.onDestroy();
    }
    @Nullable @Override public IBinder onBind(Intent intent) { return null; }
}
