package com.ashenvalley.wildfall;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

public final class MainActivity extends Activity {
  private static final String HOST = "appassets.androidplatform.net";
  private WebView web;
  private SharedPreferences preferences;
  private void immersive() {
    getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
  }
  @Override public void onCreate(Bundle saved) {
    super.onCreate(saved);
    getWindow().setStatusBarColor(Color.rgb(18,18,22));
    getWindow().setNavigationBarColor(Color.rgb(18,18,22));
    if (Build.VERSION.SDK_INT >= 28) {
      WindowManager.LayoutParams params = getWindow().getAttributes();
      params.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
      getWindow().setAttributes(params);
    }
    preferences = getSharedPreferences("wildfall", MODE_PRIVATE);
    web = new WebView(this);
    web.setBackgroundColor(Color.rgb(18,18,22));
    WebSettings settings = web.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setAllowFileAccess(false);
    settings.setAllowContentAccess(false);
    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    settings.setMediaPlaybackRequiresUserGesture(true);
    settings.setTextZoom(100);
    web.addJavascriptInterface(new NativeBridge(), "Android");
    web.setWebChromeClient(new WebChromeClient());
    web.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        return !HOST.equals(request.getUrl().getHost());
      }
      @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        Uri url = request.getUrl();
        if (!"https".equals(url.getScheme()) || !HOST.equals(url.getHost()) || !url.getPath().startsWith("/assets/")) return error(403, "Forbidden");
        String path = url.getPath().substring("/assets/".length());
        if (path.isEmpty() || path.contains("..") || path.contains("\\")) return error(403, "Forbidden");
        String type = mime(path);
        try {
          Map<String,String> headers = new HashMap<>();
          headers.put("Cache-Control", "no-cache");
          headers.put("X-Content-Type-Options", "nosniff");
          return new WebResourceResponse(type, type.startsWith("text/") || type.contains("javascript") || type.contains("json") ? "UTF-8" : null, 200, "OK", headers, getAssets().open(path));
        } catch (IOException ignored) { return error(404, "Not Found"); }
      }
    });
    setContentView(web);
    if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::goBack);
    web.loadUrl("https://" + HOST + "/assets/index.html");
    immersive();
  }
  private static WebResourceResponse error(int code, String reason) {
    return new WebResourceResponse("text/plain", "UTF-8", code, reason, Collections.emptyMap(), new ByteArrayInputStream(reason.getBytes()));
  }
  private static String mime(String file) {
    if (file.endsWith(".html")) return "text/html";
    if (file.endsWith(".js")) return "application/javascript";
    if (file.endsWith(".json")) return "application/json";
    if (file.endsWith(".css")) return "text/css";
    if (file.endsWith(".svg")) return "image/svg+xml";
    if (file.endsWith(".webp")) return "image/webp";
    if (file.endsWith(".png")) return "image/png";
    if (file.endsWith(".ogg")) return "audio/ogg";
    if (file.endsWith(".ttf")) return "font/ttf";
    return "application/octet-stream";
  }
  private void goBack() { if(web!=null)web.evaluateJavascript("window.wildfallBack && window.wildfallBack()",null); }
  @Override public void onBackPressed() { goBack(); }
  @Override public void onWindowFocusChanged(boolean focused) { super.onWindowFocusChanged(focused); if(focused)immersive(); }
  @Override protected void onPause() { if(web!=null){web.evaluateJavascript("window.wildfallPause && window.wildfallPause()",null);web.onPause();}super.onPause(); }
  @Override protected void onResume() { super.onResume();if(web!=null)web.onResume();immersive(); }
  @Override protected void onDestroy() { if(web!=null){web.removeJavascriptInterface("Android");web.destroy();web=null;}super.onDestroy(); }
  private final class NativeBridge {
    @JavascriptInterface public void saveBackup(String json) { if(json!=null&&json.length()<600000)preferences.edit().putString("backup",json).apply(); }
    @JavascriptInterface public String loadBackup() { return preferences.getString("backup",""); }
    @JavascriptInterface public void haptic() {
      runOnUiThread(()->{Vibrator v=(Vibrator)getSystemService(VIBRATOR_SERVICE);if(v!=null&&v.hasVibrator())v.vibrate(VibrationEffect.createOneShot(18,VibrationEffect.DEFAULT_AMPLITUDE));});
    }
    @JavascriptInterface public void share(String text) {
      if(text==null||text.length()>2000)return;
      runOnUiThread(()->{Intent intent=new Intent(Intent.ACTION_SEND);intent.setType("text/plain");intent.putExtra(Intent.EXTRA_TEXT,text);startActivity(Intent.createChooser(intent,"Share your WILDFALL journey"));});
    }
    @JavascriptInterface public void exit() { runOnUiThread(()->finish()); }
  }
}
