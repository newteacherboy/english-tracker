package com.dijimedu.ingilizce;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.BridgeActivity;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

// Uygulama içeriği canlı siteden (app.dijimedu.com) gelir; web güncellemeleri sürüm beklemeden görünür.
// Sürüme bağlı yerel katman (reklam, üyelik, bildirim, geri tuşu) paketteki android-runtime.js dosyasındadır
// ve yalnız bu sitenin sayfalarına, sayfa açılırken eklenir.
public class MainActivity extends BridgeActivity {
    private static final String ORIGIN = "https://app.dijimedu.com";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DmBillingPlugin.class);
        super.onCreate(savedInstanceState);
        injectRuntime();
    }

    private void injectRuntime() {
        try {
            WebView webView = getBridge().getWebView();
            String runtime = "window.dmNativeRuntime=true;\n" + readAsset("public/ingilizce/android-runtime.js");
            if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
                WebViewCompat.addDocumentStartJavaScript(webView, runtime, Collections.singleton(ORIGIN));
            } else {
                Log.w("DijiMedu", "DOCUMENT_START_SCRIPT desteklenmiyor; yerel katman eklenemedi");
            }
        } catch (Exception e) {
            Log.e("DijiMedu", "Yerel katman eklenemedi", e);
        }
    }

    private String readAsset(String path) throws Exception {
        try (InputStream in = getAssets().open(path); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        }
    }
}
