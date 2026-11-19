package com.dijimedu.ingilizce;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;

@CapacitorPlugin(name = "DmPapiSpeech", permissions = {
    @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
})
public class DmPapiSpeechPlugin extends Plugin {
    private SpeechRecognizer recognizer;
    private String session;

    @PluginMethod public void start(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "permissionResult");
        } else begin(call);
    }

    @PermissionCallback private void permissionResult(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject("Microphone permission denied", "not-allowed");
        } else begin(call);
    }

    private void begin(PluginCall call) {
        String id = call.getString("session");
        if (id == null || id.isEmpty()) { call.reject("Missing session"); return; }
        getActivity().runOnUiThread(() -> {
            if (recognizer != null) { call.reject("Recognizer busy"); return; }
            if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
                call.reject("Recognition unavailable"); return;
            }
            try {
                final SpeechRecognizer r = SpeechRecognizer.createSpeechRecognizer(getContext());
                recognizer = r;
                session = id;
                r.setRecognitionListener(new RecognitionListener() {
                    private boolean current() { return recognizer == r && id.equals(session); }
                    private void event(String kind, String value) {
                        if (!current()) return;
                        JSObject data = new JSObject();
                        data.put("session", id); data.put("kind", kind);
                        if (value != null) data.put("value", value);
                        notifyListeners("speech", data);
                    }
                    private String best(Bundle b) {
                        ArrayList<String> results = b == null ? null : b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        return results == null || results.isEmpty() ? "" : results.get(0);
                    }
                    public void onReadyForSpeech(Bundle b) { event("ready", null); }
                    public void onBeginningOfSpeech() { event("speechstart", null); }
                    public void onRmsChanged(float rms) {}
                    public void onBufferReceived(byte[] b) {}
                    public void onEndOfSpeech() { event("speechend", null); }
                    public void onError(int code) {
                        if (!current()) return;
                        String error = code == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS ? "not-allowed"
                            : (code == SpeechRecognizer.ERROR_NO_MATCH || code == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) ? "no-speech" : "audio-capture";
                        event("error", error); release();
                    }
                    public void onResults(Bundle b) {
                        if (!current()) return;
                        String value = best(b);
                        if (value.isEmpty()) event("error", "no-speech"); else event("final", value);
                        release();
                    }
                    public void onPartialResults(Bundle b) {
                        String value = best(b); if (!value.isEmpty()) event("partial", value);
                    }
                    public void onEvent(int type, Bundle b) {}
                });
                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, call.getString("language", "en-US"));
                intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
                r.startListening(intent);
                call.resolve();
            } catch (Exception e) { release(); call.reject("Recognition failed", e); }
        });
    }
    private void release() {
        SpeechRecognizer old = recognizer;
        recognizer = null; session = null;
        if (old != null) { try { old.cancel(); } catch (Exception ignored) {} try { old.destroy(); } catch (Exception ignored) {} }
    }
    @PluginMethod public void abort(PluginCall call) {
        String id = call.getString("session");
        getActivity().runOnUiThread(() -> {
            if (id != null && id.equals(session)) release();
            call.resolve();
        });
    }
    @Override protected void handleOnPause() { getActivity().runOnUiThread(this::release); }
    @Override protected void handleOnDestroy() { getActivity().runOnUiThread(this::release); }
}
