package com.rubenpangan.weathernow;

import android.content.Intent;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeSpeech")
public class NativeSpeechPlugin extends Plugin {
    @PluginMethod
    public void warmup(PluginCall call) {
        getContext().startService(new Intent(getContext(), NativeSpeechService.class).setAction(NativeSpeechService.ACTION_WARMUP));
        call.resolve();
    }

    @PluginMethod public void speak(PluginCall call) {
        Intent intent = new Intent(getContext(), NativeSpeechService.class).setAction(NativeSpeechService.ACTION_SPEAK)
            .putExtra("text", call.getString("text", "")).putExtra("language", call.getString("language", "en-US"))
            .putExtra("rate", call.getFloat("rate", 1.05f)).putExtra("pitch", call.getFloat("pitch", 1.1f));
        ContextCompat.startForegroundService(getContext(), intent); call.resolve();
    }
    @PluginMethod public void stop(PluginCall call) {
        // Stop the live TTS instance directly before resolving the JS call.
        // The old implementation only queued ACTION_STOP and resolved immediately,
        // so YouTube/MP3 could resume while the forecaster was still speaking.
        if (!NativeSpeechService.stopActiveSpeech()) {
            getContext().stopService(new Intent(getContext(), NativeSpeechService.class));
        }
        call.resolve();
    }
}
