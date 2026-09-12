package com.rubenpangan.weathernow;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;

@CapacitorPlugin(name = "NativeAudio")
public class NativeAudioPlugin extends Plugin {
    @PluginMethod public void pickAudio(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.setType("audio/*");
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        startActivityForResult(call, intent, "pickAudioResult");
    }

    @ActivityCallback private void pickAudioResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) { call.resolve(new JSObject().put("tracks", new JSArray())); return; }
        Intent data = result.getData();
        JSArray tracks = new JSArray();
        if (data.getClipData() != null) {
            for (int i = 0; i < data.getClipData().getItemCount(); i++) addTrack(tracks, data.getClipData().getItemAt(i).getUri());
        } else if (data.getData() != null) addTrack(tracks, data.getData());
        call.resolve(new JSObject().put("tracks", tracks));
    }

    private void addTrack(JSArray tracks, Uri uri) {
        try { getContext().getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION); } catch (Exception ignored) {}
        String name = uri.getLastPathSegment() == null ? "Device audio" : uri.getLastPathSegment();
        tracks.put(new JSObject().put("name", name).put("url", uri.toString()));
    }

    private void send(String action) { ContextCompat.startForegroundService(getContext(), new Intent(getContext(), PlaybackService.class).setAction(action)); }
    @PluginMethod public void playPlaylist(PluginCall call) {
        JSArray tracks = call.getArray("tracks", new JSArray()); ArrayList<String> urls = new ArrayList<>(); ArrayList<String> names = new ArrayList<>();
        try { for (int i=0;i<tracks.length();i++) { JSObject t = JSObject.fromJSONObject(tracks.getJSONObject(i)); urls.add(t.getString("url")); names.add(t.getString("name")); } } catch(Exception e) { call.reject("Invalid audio playlist", e); return; }
        Intent intent = new Intent(getContext(), PlaybackService.class).setAction(PlaybackService.ACTION_PLAYLIST).putStringArrayListExtra("urls", urls).putStringArrayListExtra("names", names).putExtra("index", call.getInt("index", 0));
        ContextCompat.startForegroundService(getContext(), intent); call.resolve();
    }
    @PluginMethod public void pause(PluginCall c){ send(PlaybackService.ACTION_PAUSE); c.resolve(); }
    @PluginMethod public void resume(PluginCall c){ send(PlaybackService.ACTION_RESUME); c.resolve(); }
    @PluginMethod public void next(PluginCall c){ send(PlaybackService.ACTION_NEXT); c.resolve(); }
    @PluginMethod public void previous(PluginCall c){ send(PlaybackService.ACTION_PREVIOUS); c.resolve(); }
    @PluginMethod public void stop(PluginCall c){ send(PlaybackService.ACTION_STOP); c.resolve(); }
    @PluginMethod public void select(PluginCall c){ Intent i=new Intent(getContext(),PlaybackService.class).setAction(PlaybackService.ACTION_SELECT).putExtra("index",c.getInt("index",0)); ContextCompat.startForegroundService(getContext(),i); c.resolve(); }
}
