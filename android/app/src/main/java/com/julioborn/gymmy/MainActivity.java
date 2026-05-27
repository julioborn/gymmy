package com.julioborn.gymmy;

import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Prevent Android from delegating http/https navigation to Chrome.
        // Capacitor's default client opens any URL it considers "external" in
        // the system browser; since server.url points to gymmy.com.ar, every
        // navigation would look external before the bridge is fully initialised.
        bridge.getWebView().setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                // Keep all web traffic inside the WebView
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    return false;
                }
                // Let the default handler deal with custom schemes (mailto:, tel:, etc.)
                return super.shouldOverrideUrlLoading(view, request);
            }
        });
    }
}
