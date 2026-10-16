package com.hoodmoshla.hermesarabic;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.provider.Settings;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.system.Os;
import android.util.Log;
import android.view.inputmethod.InputMethodManager;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebResourceRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.util.Base64;
import androidx.activity.OnBackPressedCallback;
import androidx.core.content.FileProvider;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.BridgeActivity;
import com.chaquo.python.PyObject;
import com.chaquo.python.Python;
import com.chaquo.python.android.AndroidPlatform;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLConnection;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.ArrayList;
import java.util.Locale;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "HermesApp";
    private static final int EMBEDDED_AGENT_PORT = 9129;
    private static final int REQ_PICK_FILES = 9001;
    private static final int REQ_CAPTURE_PHOTO = 9005;
    private static final int REQ_RECORD_AUDIO = 9002;
    private static final int REQ_SPEECH_TEXT = 9003;
    private static MainActivity activeInstance;
    private static final int REQ_NOTIFICATIONS = 9004;
    private int safeTopPx = 0;
    private int safeRightPx = 0;
    private int safeBottomPx = 0;
    private int safeLeftPx = 0;
    private CountDownLatch filePickerLatch;
    private ArrayList<String> filePickerPaths = new ArrayList<>();
    private CountDownLatch cameraCaptureLatch;
    private File cameraCaptureOutputFile;
    private String cameraCapturePath = "";
    private String cameraCaptureError = "";
    private CountDownLatch microphoneLatch;
    private boolean microphoneGranted = false;
    private CountDownLatch speechLatch;
    private String speechText = "";
    private String speechError = "";
    private SpeechRecognizer activeSpeechRecognizer;
    private TextToSpeech textToSpeech;
    private boolean textToSpeechReady = false;
    private boolean hermesNodeRuntimeReady = false;
    private AndroidAdbManager androidAdbManager;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        super.onCreate(savedInstanceState);
        activeInstance = this;
        androidAdbManager = new AndroidAdbManager(this);
        LocalModelManager.initialize(this);
        GitHubConnector.initialize(this, this);
        configureWebViewForPhoneScreen();
        installHermesWebViewClient();
        installBackNavigationHandler();
        HermesForegroundService.start(this);
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFICATIONS);
        }
    }

    public static boolean speakTextFromPython(String text, String language, int timeoutMs) {
        MainActivity activity = activeInstance;
        if (activity == null) {
            Log.w(TAG, "Python TTS requested before MainActivity is active");
            return false;
        }
        try {
            activity.speakTextBlocking(text, language, timeoutMs > 0 ? timeoutMs : 30000);
            return true;
        } catch (Exception e) {
            Log.w(TAG, "Python TTS failed", e);
            return false;
        }
    }

    /**
     * Android 原生桥边界: 负责启动 APK 内置 Python/Hermes 运行时。
     * 真实 Agent 代码在 src/main/python 中,这里不放业务逻辑。
     */
    private synchronized Python ensureEmbeddedPython() {
        if (!Python.isStarted()) {
            Python.start(new AndroidPlatform(this));
        }
        return Python.getInstance();
    }

    private void warmEmbeddedHermesRuntime() {
        new Thread(() -> {
            try {
                String result = callEmbeddedBackend("initialize", getFilesDir().getAbsolutePath(), EMBEDDED_AGENT_PORT);
                Log.i(TAG, "Embedded Hermes initialize: " + result);
            } catch (Exception e) {
                Log.w(TAG, "Embedded Hermes warmup failed", e);
            }
        }, "hermes-python-warmup").start();
    }

    private String callEmbeddedBackend(String method, Object... args) {
        return EmbeddedHermesRuntime.call(this, method, args);
    }

    private String embeddedErrorJson(Exception e) {
        JSONObject result = new JSONObject();
        try {
            result.put("ok", false);
            result.put("available", false);
            result.put("running", false);
            result.put("port", EMBEDDED_AGENT_PORT);
            result.put("error", e == null ? "Embedded Hermes unavailable" : e.getMessage());
        } catch (Exception ignored) {
            // ignore
        }
        return result.toString();
    }

    private synchronized void prepareHermesNodeRuntime() throws Exception {
        if (hermesNodeRuntimeReady) {
            return;
        }

        File runtimeDir = new File(getFilesDir(), "hermes-node");
        File tuiDir = new File(getFilesDir(), "hermes-tui");
        File nodeBin = new File(getApplicationInfo().nativeLibraryDir, "libnode_exec.so");
        File tuiEntry = new File(tuiDir, "dist/entry.js");
        File marker = new File(getFilesDir(), ".hermes-runtime-v3-ready");
        if (!marker.isFile() || !nodeBin.isFile() || !new File(runtimeDir, "lib/libz.so.1").isFile() || !tuiEntry.isFile()) {
            deleteRecursively(runtimeDir);
            deleteRecursively(tuiDir);
            copyAssetTree("hermes-node", runtimeDir);
            copyAssetTree("hermes-tui", tuiDir);
            if (!nodeBin.setExecutable(true, true)) {
                Log.w(TAG, "Failed to mark embedded Node executable");
            }
            try (FileOutputStream out = new FileOutputStream(marker)) {
                out.write("node=v24.17.0\ntui=prebuilt\n".getBytes(StandardCharsets.UTF_8));
            }
        }
        configureHermesRuntimeEnvironment(nodeBin, new File(runtimeDir, "lib"), tuiDir);
        hermesNodeRuntimeReady = true;
    }

    private void configureHermesRuntimeEnvironment(File nodeBin, File nodeLibDir, File tuiDir) {
        try {
            Os.setenv("HERMES_NODE", nodeBin.getAbsolutePath(), true);
            Os.setenv("HERMES_ANDROID_NATIVE_LIB_DIR", getApplicationInfo().nativeLibraryDir, true);
            Os.setenv("HERMES_ANDROID_ADB_HOME", getFilesDir().getAbsolutePath(), true);
            Os.setenv("HERMES_TUI_DIR", tuiDir.getAbsolutePath(), true);
            Os.setenv("HERMES_SKIP_NODE_BOOTSTRAP", "1", true);
            String currentLdPath = System.getenv("LD_LIBRARY_PATH");
            String libPath = nodeLibDir.getAbsolutePath();
            if (currentLdPath != null && !currentLdPath.isEmpty() && !currentLdPath.contains(libPath)) {
                libPath = libPath + ":" + currentLdPath;
            }
            Os.setenv("LD_LIBRARY_PATH", libPath, true);
        } catch (Exception e) {
            Log.w(TAG, "Failed to configure embedded Hermes runtime env", e);
        }
    }

    private void copyAssetTree(String assetPath, File target) throws Exception {
        String[] children = getAssets().list(assetPath);
        if (children != null && children.length > 0) {
            if (!target.isDirectory() && !target.mkdirs()) {
                throw new IllegalStateException("Unable to create directory: " + target);
            }
            for (String child : children) {
                copyAssetTree(assetPath + "/" + child, new File(target, child));
            }
            return;
        }

        File parent = target.getParentFile();
        if (parent != null && !parent.isDirectory() && !parent.mkdirs()) {
            throw new IllegalStateException("Unable to create directory: " + parent);
        }
        try (InputStream in = getAssets().open(assetPath);
             OutputStream out = new FileOutputStream(target)) {
            byte[] buffer = new byte[1024 * 256];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
        }
    }

    private void deleteRecursively(File file) {
        if (file == null || !file.exists()) {
            return;
        }
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursively(child);
                }
            }
        }
        if (!file.delete()) {
            Log.w(TAG, "Failed to delete " + file.getAbsolutePath());
        }
    }

    @Override
    public void onDestroy() {
        if (activeInstance == this) {
            activeInstance = null;
        }
        GitHubConnector.setForegroundActivity(null);
        destroyActiveSpeechRecognizer();
        if (textToSpeech != null) {
            try {
                textToSpeech.stop();
                textToSpeech.shutdown();
            } catch (Exception ignored) {
                // ignore
            }
            textToSpeech = null;
            textToSpeechReady = false;
        }
        super.onDestroy();
    }

    @Override
    public void onResume() {
        super.onResume();
        GitHubConnector.setForegroundActivity(this);
    }

    @Override
    public void onStop() {
        GitHubConnector.setForegroundActivity(null);
        super.onStop();
    }

    @Override
    public void onBackPressed() {
        handleAppBackNavigation(() -> super.onBackPressed());
    }

    private void installBackNavigationHandler() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                handleAppBackNavigation(() -> {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                    setEnabled(true);
                });
            }
        });
    }

    private void handleAppBackNavigation(Runnable fallback) {
        if (bridge == null || bridge.getWebView() == null) {
            fallback.run();
            return;
        }
        WebView webView = bridge.getWebView();
        String url = webView.getUrl();
        if (isEmbeddedDashboardUrl(url)) {
            if (webView.canGoBack()) {
                webView.goBack();
            } else {
                returnToMobileHome();
            }
            return;
        }
        webView.evaluateJavascript(
            "(function(){try{return !!(window.__hermesHandleMobileBack&&window.__hermesHandleMobileBack());}catch(e){return false;}})()",
            value -> {
                if ("true".equals(value)) {
                    return;
                }
                runOnUiThread(fallback);
            }
        );
    }

    private void configureWebViewForPhoneScreen() {
        if (bridge == null || bridge.getWebView() == null) {
            return;
        }

        WebView webView = bridge.getWebView();
        WebSettings settings = webView.getSettings();
        settings.setUseWideViewPort(false);
        settings.setLoadWithOverviewMode(false);
        settings.setTextZoom(100);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) settings.setSafeBrowsingEnabled(true);
        webView.addJavascriptInterface(new HermesAndroidBridge(), "HermesAndroid");
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    if (request == null) {
                        return;
                    }
                    boolean wantsAudio = false;
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                            wantsAudio = true;
                            break;
                        }
                    }
                    if (wantsAudio && hasRecordAudioPermission()) {
                        request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                    } else {
                        request.deny();
                    }
                });
            }
        });
        webView.setInitialScale(0);

        ViewCompat.setOnApplyWindowInsetsListener(webView, (view, insets) -> {
            Insets systemBars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            safeTopPx = systemBars.top;
            safeRightPx = systemBars.right;
            safeBottomPx = systemBars.bottom;
            safeLeftPx = systemBars.left;
            pushSafeAreaInsetsToPage(webView);
            return insets;
        });
        ViewCompat.requestApplyInsets(webView);
    }

    /**
     * 让 Hermes 本地页面留在 App WebView 内打开,并在页面加载后套用
     * Android 包装层的移动端屏幕适配。
     */
    private void installHermesWebViewClient() {
        if (bridge == null) {
            Log.w(TAG, "Capacitor bridge unavailable; skip WebView integration tweaks");
            return;
        }

        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                String scheme = url == null ? "" : url.getScheme();
                if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                    if (isTrustedWebOrigin(url)) return false;
                    return "https".equalsIgnoreCase(scheme) ? openExternalUri(url) : true;
                }
                if (scheme == null || scheme.isEmpty()) return true;
                return openExternalUri(url);
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request == null ? null : request.getUrl();
                if (isTrustedWebOrigin(url)) return super.shouldInterceptRequest(view, request);
                if (url != null && "data".equalsIgnoreCase(url.getScheme())) {
                    String data = url.getSchemeSpecificPart();
                    if (data != null && !data.toLowerCase(Locale.ROOT).startsWith("text/html")
                            && !data.toLowerCase(Locale.ROOT).startsWith("image/svg+xml")) {
                        return super.shouldInterceptRequest(view, request);
                    }
                }
                return new WebResourceResponse("text/plain", "UTF-8", new java.io.ByteArrayInputStream(new byte[0]));
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                injectHermesMobileTweaks(view);
                pushSafeAreaInsetsToPage(view);
            }
        });
    }

    private boolean isTrustedWebOrigin(Uri uri) {
        if (uri == null) return false;
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
        int port = uri.getPort();
        if ("https".equals(scheme) && "localhost".equals(host) && (port == -1 || port == 443)) return true;
        boolean loopback = "127.0.0.1".equals(host) || "localhost".equals(host);
        return "http".equals(scheme) && loopback && (port == EMBEDDED_AGENT_PORT || port == LocalModelManager.SERVER_PORT);
    }

    private boolean openExternalUri(Uri uri) {
        if (uri == null) {
            return false;
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!("https".equals(scheme) || "mailto".equals(scheme) || "tel".equals(scheme))) return true;
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            return true;
        } catch (ActivityNotFoundException e) {
            Log.w(TAG, "No app can open url: " + uri, e);
            return true;
        } catch (Exception e) {
            Log.w(TAG, "Failed to open external url: " + uri, e);
            return true;
        }
    }

    private void injectHermesMobileTweaks(WebView view) {
        view.evaluateJavascript(buildHermesMobileTweaksScript(), null);
        injectHermesArabicLocale(view);
        view.postDelayed(() -> pushSafeAreaInsetsToPage(view), 120);
    }

    private void injectHermesArabicLocale(WebView view) {
        try (InputStream input = getAssets().open("hermes-arabic-locale.js");
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int count;
            while ((count = input.read(buffer)) != -1) {
                output.write(buffer, 0, count);
            }
            String script = new String(output.toByteArray(), StandardCharsets.UTF_8);
            view.evaluateJavascript(script, null);
        } catch (Exception exception) {
            Log.w(TAG, "Arabic interface localization could not be applied", exception);
        }
    }

    private boolean isTerminalModeUrl(String url) {
        return url != null
            && (url.contains("127.0.0.1:" + EMBEDDED_AGENT_PORT) || url.contains("localhost:" + EMBEDDED_AGENT_PORT))
            && url.contains("/chat")
            && url.contains("android-mobile-terminal");
    }

    private boolean returnToMobileHomeIfTerminalMode() {
        if (bridge == null || bridge.getWebView() == null) {
            return false;
        }
        WebView webView = bridge.getWebView();
        if (!isTerminalModeUrl(webView.getUrl())) {
            return false;
        }
        runOnUiThread(() -> webView.loadUrl("https://localhost/"));
        return true;
    }

    private boolean isEmbeddedDashboardUrl(String url) {
        return url != null
            && (url.contains("127.0.0.1:" + EMBEDDED_AGENT_PORT) || url.contains("localhost:" + EMBEDDED_AGENT_PORT));
    }

    private void returnToMobileHome() {
        if (bridge == null || bridge.getWebView() == null) {
            return;
        }
        runOnUiThread(() -> bridge.getWebView().loadUrl("https://localhost/"));
    }

    private void pushSafeAreaInsetsToPage(WebView view) {
        if (view == null) {
            return;
        }
        String js = String.format(
            "window.__hermesAndroidSetInsets&&window.__hermesAndroidSetInsets(%d,%d,%d,%d);",
            safeTopPx,
            safeRightPx,
            safeBottomPx,
            safeLeftPx
        );
        view.evaluateJavascript(js, null);
    }

    private String buildHermesMobileTweaksScript() {
        return String.join("\n",
            "(function(){",
            "  try {",
            "    var style = document.getElementById('hermes-android-mobile-style');",
            "    if (!style) {",
            "      style = document.createElement('style');",
            "      style.id = 'hermes-android-mobile-style';",
            "      document.head.appendChild(style);",
            "    }",
            "    style.setAttribute('data-version', 'desktop-mobile-layout-2026-07-03-13');",
            "      style.textContent = `",
            "html.hermes-android-app{--hermes-safe-top:0px;--hermes-safe-right:0px;--hermes-safe-bottom:0px;--hermes-safe-left:0px;--hermes-mobile-bottom-gap:max(36px,calc(var(--hermes-safe-bottom,0px) + 18px));overscroll-behavior:none;background:#10141b;}",
            "html.hermes-android-app,html.hermes-android-app body{width:var(--hermes-app-width,100vw)!important;height:var(--hermes-app-height,100dvh)!important;max-width:100vw!important;max-height:100dvh!important;overflow:hidden!important;}",
            "html.hermes-android-app body{position:fixed!important;inset:0!important;margin:0!important;padding:var(--hermes-safe-top,0px) var(--hermes-safe-right,0px) var(--hermes-mobile-bottom-gap,10px) var(--hermes-safe-left,0px)!important;box-sizing:border-box!important;background:#10141b;-webkit-tap-highlight-color:transparent;}",
            "html.hermes-android-app #root{width:100%!important;height:calc(var(--hermes-app-height,100dvh) - var(--hermes-safe-top,0px) - var(--hermes-mobile-bottom-gap,10px))!important;max-width:100vw!important;overflow:hidden!important;}",
            "html.hermes-android-app #root>div{height:100%!important;min-height:0!important;max-height:100%!important;}",
            "html.hermes-android-app input,html.hermes-android-app textarea,html.hermes-android-app select{font-size:16px!important;}",
            "html.hermes-android-app button{touch-action:manipulation;}",
            "@media(max-width:640px){",
            "  html.hermes-android-app{font-size:14px;}",
            "  html.hermes-android-app body{padding-bottom:var(--hermes-mobile-bottom-gap)!important;}",
            "  html.hermes-android-app #root aside,html.hermes-android-app #root [data-sidebar='sidebar'],html.hermes-android-app #root [data-slot='sidebar']{display:none!important;}",
            "  html.hermes-android-app #root [data-hermes-force-sidebar='true']{display:block!important;position:relative!important;z-index:2147483600!important;width:min(84vw,340px)!important;max-width:min(84vw,340px)!important;min-width:0!important;height:100%!important;min-height:0!important;overflow:auto!important;transform:none!important;opacity:1!important;visibility:visible!important;background:var(--background,#fff)!important;}",
            "  html.hermes-android-app #root [data-hermes-mobile-sidebar-shell='true']{pointer-events:none!important;position:fixed!important;z-index:2147483600!important;top:var(--hermes-safe-top,0px)!important;bottom:var(--hermes-mobile-bottom-gap)!important;left:0!important;width:min(84vw,340px)!important;max-width:min(84vw,340px)!important;height:auto!important;min-width:0!important;overflow:visible!important;transform:translateX(calc(-100% - 16px))!important;transition:transform .18s ease-out!important;}",
            "  html.hermes-android-app.hermes-mobile-sidebar-open #root [data-hermes-mobile-sidebar-shell='true']{--tw-translate-x:0px!important;--tw-translate-y:0px!important;pointer-events:auto!important;translate:0 0!important;transform:none!important;}",
            "  html.hermes-android-app.hermes-mobile-sidebar-open #root aside,html.hermes-android-app.hermes-mobile-sidebar-open #root [data-sidebar='sidebar'],html.hermes-android-app.hermes-mobile-sidebar-open #root [data-slot='sidebar'],html.hermes-android-app.hermes-mobile-sidebar-open #root [data-hermes-force-sidebar='true']{display:block!important;position:relative!important;z-index:2147483600!important;top:auto!important;bottom:auto!important;left:auto!important;width:min(84vw,340px)!important;max-width:min(84vw,340px)!important;min-width:0!important;height:100%!important;transform:none!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important;background:var(--background,#fff)!important;box-shadow:0 18px 48px rgba(15,23,42,.24)!important;}",
            "  html.hermes-android-app.hermes-mobile-sidebar-open #root [data-hermes-mobile-sidebar-shell='true'] *,html.hermes-android-app.hermes-mobile-sidebar-open #root [data-hermes-force-sidebar='true'] *{pointer-events:auto!important;}",
            "  html.hermes-android-app #hermes-mobile-menu-button{display:grid!important;}",
            "  html.hermes-android-app #hermes-mobile-sidebar-scrim{display:none;}",
            "  html.hermes-android-app.hermes-mobile-sidebar-open #hermes-mobile-sidebar-scrim{display:block;position:fixed;top:var(--hermes-safe-top,0px);right:0;bottom:var(--hermes-mobile-bottom-gap);left:min(84vw,340px);z-index:2147483599;background:rgba(15,23,42,.34);}",
            "  html.hermes-android-app #root main{width:100%!important;max-width:100%!important;margin-left:0!important;margin-right:0!important;}",
            "  html.hermes-android-app #root [class*='w-['][class*='--sidebar'],html.hermes-android-app #root [class*='right-rail'],html.hermes-android-app #root [class*='RightRail']{display:none!important;}",
            "  html.hermes-android-app #root footer,html.hermes-android-app #root [class*='statusbar'],html.hermes-android-app #root [class*='Statusbar']{display:none!important;}",
            "  html.hermes-android-app textarea{max-height:34dvh!important;}",
            "  html.hermes-android-app [data-slot='composer-attachments']{max-height:22dvh;overflow:auto;}",
            "  html.hermes-android-app button{min-height:38px;}",
            "  html.hermes-android-app [data-slot='composer-root'] button{min-width:44px!important;min-height:44px!important;width:44px!important;height:44px!important;padding:0!important;display:inline-grid!important;place-items:center!important;border-radius:10px!important;}",
            "  html.hermes-android-app [data-slot='composer-root'] button svg,html.hermes-android-app [data-slot='composer-root'] button .codicon{width:22px!important;height:22px!important;font-size:22px!important;line-height:22px!important;}",
            "  html.hermes-android-app [role='dialog']{max-width:calc(var(--hermes-app-width,100vw) - 16px)!important;}",
            "}",
            "html.hermes-android-terminal-mode #hermes-mobile-menu-button,html.hermes-android-terminal-mode button[aria-label*='菜单'],html.hermes-android-terminal-mode button[aria-label*='menu'],html.hermes-android-terminal-mode [data-testid*='sidebar']{display:none!important;}",
            "html.hermes-android-terminal-mode body{padding-bottom:74px!important;}html.hermes-android-terminal-mode .xterm,html.hermes-android-terminal-mode .xterm-screen,html.hermes-android-terminal-mode .xterm-viewport{padding-bottom:72px!important;box-sizing:border-box!important;}",
            "#hermes-terminal-return-button{position:fixed;left:max(12px,calc(var(--hermes-safe-left,0px) + 12px));top:max(78px,calc(var(--hermes-safe-top,0px) + 46px));z-index:2147483602;border:1px solid rgba(240,230,210,.42);border-radius:12px;background:rgba(6,19,17,.92);color:#fff4d6;padding:0 14px;min-width:124px;height:48px;font:800 15px/48px system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 12px 28px rgba(0,0,0,.34);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);}",
            "#hermes-terminal-shortcuts{position:fixed;left:max(8px,calc(var(--hermes-safe-left,0px) + 8px));right:max(8px,calc(var(--hermes-safe-right,0px) + 8px));bottom:max(8px,calc(var(--hermes-safe-bottom,0px) + 8px));z-index:2147483602;display:flex;gap:6px;overflow-x:auto;padding:7px;border-radius:16px;background:rgba(2,11,10,.92);box-shadow:0 16px 42px rgba(0,0,0,.42);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);}",
            "#hermes-terminal-shortcuts button{flex:0 0 auto;border:1px solid rgba(240,230,210,.28);border-radius:12px;background:rgba(255,255,255,.08);color:#fff4d6;min-width:48px;height:40px;padding:0 10px;font:800 13px/40px system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}",
            "      `;",
            "    document.documentElement.classList.add('hermes-android-app');",
            "    var viewport = document.querySelector('meta[name=\"viewport\"]');",
            "    if (!viewport) {",
            "      viewport = document.createElement('meta');",
            "      viewport.setAttribute('name', 'viewport');",
            "      document.head.appendChild(viewport);",
            "    }",
            "    viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no');",
            "    function installTerminalReturnButton() {",
            "      var terminalMode = /[?&]channel=android-mobile-terminal(?:&|$)/.test(location.search) || /android-mobile-terminal/.test(location.href);",
            "      document.documentElement.classList.toggle('hermes-android-terminal-mode', terminalMode);",
            "      var existing = document.getElementById('hermes-terminal-return-button');",
            "      var shortcuts = document.getElementById('hermes-terminal-shortcuts');",
            "      if (!terminalMode) { if (existing) existing.remove(); if (shortcuts) shortcuts.remove(); return; }",
            "      if (existing) { installTerminalShortcuts(); return; }",
            "      var button = document.createElement('button');",
            "      button.id = 'hermes-terminal-return-button';",
            "      button.type = 'button';",
            "      button.textContent = '返回移动界面';",
            "      button.setAttribute('aria-label', '返回移动界面');",
            "      button.addEventListener('click', function(){",
            "        if (window.HermesAndroid && typeof window.HermesAndroid.returnToMobileHome === 'function') {",
            "          window.HermesAndroid.returnToMobileHome();",
            "        } else {",
            "          window.location.href = 'https://localhost/';",
            "        }",
            "      });",
            "      document.body.appendChild(button);",
            "      installTerminalShortcuts();",
            "    }",
            "    function terminalFocusTarget() {",
            "      var target = document.querySelector('.xterm-helper-textarea') || document.querySelector('textarea') || document.activeElement || document.body;",
            "      try { target.focus({ preventScroll: true }); } catch (error) { try { target.focus(); } catch (_) {} }",
            "      return target || document.body;",
            "    }",
            "    function sendTerminalKey(key, options) {",
            "      var target = terminalFocusTarget();",
            "      var eventInit = Object.assign({ key: key, code: key, bubbles: true, cancelable: true }, options || {});",
            "      target.dispatchEvent(new KeyboardEvent('keydown', eventInit));",
            "      target.dispatchEvent(new KeyboardEvent('keyup', eventInit));",
            "    }",
            "    function installTerminalShortcuts() {",
            "      if (document.getElementById('hermes-terminal-shortcuts')) return;",
            "      var bar = document.createElement('div');",
            "      bar.id = 'hermes-terminal-shortcuts';",
            "      var keys = [",
            "        ['Esc','Escape',{}], ['Tab','Tab',{}], ['Ctrl C','c',{ctrlKey:true}], ['Ctrl D','d',{ctrlKey:true}], ['Ctrl L','l',{ctrlKey:true}], ['↑','ArrowUp',{}], ['↓','ArrowDown',{}], ['←','ArrowLeft',{}], ['→','ArrowRight',{}]",
            "      ];",
            "      keys.forEach(function(item){",
            "        var shortcut = document.createElement('button');",
            "        shortcut.type = 'button';",
            "        shortcut.textContent = item[0];",
            "        shortcut.setAttribute('aria-label', item[0]);",
            "        shortcut.addEventListener('click', function(){ sendTerminalKey(item[1], item[2]); });",
            "        bar.appendChild(shortcut);",
            "      });",
            "      document.body.appendChild(bar);",
            "    }",
            "    function syncHermesViewport() {",
            "      var doc = document.documentElement;",
            "      var vv = window.visualViewport;",
            "      var width = Math.max(1, Math.round((vv && vv.width) || window.innerWidth || doc.clientWidth || screen.width));",
            "      var height = Math.max(1, Math.round((vv && vv.height) || window.innerHeight || doc.clientHeight || screen.height));",
            "      doc.style.setProperty('--hermes-app-width', width + 'px');",
            "      doc.style.setProperty('--hermes-app-height', height + 'px');",
            "    }",
            "    function applyHermesMobileChromeTweaks() {",
            "      if (window.innerWidth > 640) return;",
            "      document.querySelectorAll('#root [data-hermes-mobile-sidebar-shell=\"true\"]').forEach(function(node){ node.removeAttribute('data-hermes-mobile-sidebar-shell'); });",
            "      document.querySelectorAll('#root [data-hermes-force-sidebar=\"true\"]').forEach(function(node){ node.removeAttribute('data-hermes-force-sidebar'); });",
            "      var desktopSidebar = document.querySelector('#root [data-slot=\"sidebar\"]');",
            "      if (desktopSidebar) {",
            "        desktopSidebar.setAttribute('data-hermes-force-sidebar', 'true');",
            "        var shell = desktopSidebar.parentElement;",
            "        for (var s = 0; s < 5 && shell; s += 1) {",
            "          var cls = String(shell.className || '');",
            "          if (/group\\/reveal|translate-x|absolute/.test(cls)) break;",
            "          shell = shell.parentElement;",
            "        }",
            "        if (shell) { shell.setAttribute('data-hermes-mobile-sidebar-shell', 'true'); }",
            "      }",
            "      if (!document.getElementById('hermes-mobile-menu-button')) {",
            "        var scrim = document.createElement('button');",
            "        scrim.id = 'hermes-mobile-sidebar-scrim';",
            "        scrim.type = 'button';",
            "        scrim.setAttribute('aria-label', '关闭菜单');",
            "        scrim.addEventListener('click', function(){ if (window.__hermesAndroidToggleSidebar) { window.__hermesAndroidToggleSidebar(false); } else { document.documentElement.classList.remove('hermes-mobile-sidebar-open'); } });",
            "        document.body.appendChild(scrim);",
            "        var menuButton = document.createElement('button');",
            "        menuButton.id = 'hermes-mobile-menu-button';",
            "        menuButton.type = 'button';",
            "        menuButton.textContent = '☰';",
            "        menuButton.setAttribute('aria-label', '打开菜单');",
            "        menuButton.style.cssText = 'display:none;position:fixed;left:8px;top:max(42px,calc(var(--hermes-safe-top,0px) + 6px));z-index:2147483601;width:30px;height:30px;min-height:30px!important;max-height:30px;padding:0;border:0;border-radius:7px;background:rgba(255,255,255,.42);color:#111827;font-size:18px;line-height:1;box-shadow:none;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);';",
            "        menuButton.addEventListener('click', function(){ var open = !document.documentElement.classList.contains('hermes-mobile-sidebar-open'); if (window.__hermesAndroidToggleSidebar) { window.__hermesAndroidToggleSidebar(open); } else { document.documentElement.classList.toggle('hermes-mobile-sidebar-open', open); } });",
            "        document.body.appendChild(menuButton);",
            "      }",
            "      var activeSidebar = document.querySelector('#root [data-hermes-force-sidebar=\"true\"]');",
            "      if (activeSidebar && !activeSidebar.__hermesAndroidAutoCloseInstalled) {",
            "        activeSidebar.__hermesAndroidAutoCloseInstalled = true;",
            "        activeSidebar.addEventListener('click', function(event){",
            "          var target = event.target && event.target.closest ? event.target.closest('button,a,[role=\"button\"],[data-radix-collection-item]') : null;",
            "          if (!target) return;",
            "          var label = (target.innerText || target.textContent || target.getAttribute('aria-label') || '').trim();",
            "          if (/搜索|Search|Shift\\+|已置顶|会话\\s*\\d*$/i.test(label)) return;",
            "          window.setTimeout(function(){ if (window.__hermesAndroidToggleSidebar) window.__hermesAndroidToggleSidebar(false); }, 180);",
            "        }, true);",
            "      }",
            "      var buttons = Array.prototype.slice.call(document.querySelectorAll('button'));",
            "      buttons.forEach(function(button) {",
            "        var label = (button.innerText || button.getAttribute('aria-label') || '').trim();",
            "        if (!/(网关|Gateway|代理|Agents|排程|Cron|v0\\.\\d+)/.test(label)) return;",
            "        var node = button;",
            "        for (var i = 0; i < 5 && node && node.parentElement; i += 1) {",
            "          var rect = node.getBoundingClientRect();",
            "          if (rect.top > window.innerHeight - 80 && rect.height <= 64) {",
            "            node.style.display = 'none';",
            "            break;",
            "          }",
            "          node = node.parentElement;",
            "        }",
            "      });",
            "    }",
            "    function setImportant(node, prop, value) {",
            "      if (node) node.style.setProperty(prop, value, 'important');",
            "    }",
            "    function clearInlineSidebarPosition(node) {",
            "      if (!node) return;",
            "      ['position','left','right','top','bottom','width','max-width','min-width','height','min-height','transform','translate','margin','display','visibility','opacity','pointer-events','z-index','box-shadow','background','overflow'].forEach(function(prop){ node.style.removeProperty(prop); });",
            "    }",
            "    function forceHermesMobileSidebarPosition(open) {",
            "      var shell = document.querySelector('#root [data-hermes-mobile-sidebar-shell=\"true\"]');",
            "      var sidebar = document.querySelector('#root [data-slot=\"sidebar\"]');",
            "      if (!open) {",
            "        clearInlineSidebarPosition(shell);",
            "        clearInlineSidebarPosition(sidebar);",
            "        return;",
            "      }",
            "      setImportant(shell, 'position', 'fixed');",
            "      setImportant(shell, 'left', '0px');",
            "      setImportant(shell, 'right', 'auto');",
            "      setImportant(shell, 'top', 'var(--hermes-safe-top,0px)');",
            "      setImportant(shell, 'bottom', 'var(--hermes-mobile-bottom-gap,0px)');",
            "      setImportant(shell, 'width', 'min(84vw,340px)');",
            "      setImportant(shell, 'max-width', 'min(84vw,340px)');",
            "      setImportant(shell, 'min-width', 'min(84vw,340px)');",
            "      setImportant(shell, 'height', 'auto');",
            "      setImportant(shell, '--tw-translate-x', '0px');",
            "      setImportant(shell, '--tw-translate-y', '0px');",
            "      setImportant(shell, '--tw-translate-z', '0px');",
            "      setImportant(shell, 'transform', 'none');",
            "      setImportant(shell, 'translate', '0 0');",
            "      setImportant(shell, 'margin', '0');",
            "      setImportant(shell, 'display', 'block');",
            "      setImportant(shell, 'visibility', 'visible');",
            "      setImportant(shell, 'opacity', '1');",
            "      setImportant(shell, 'pointer-events', 'auto');",
            "      setImportant(shell, 'z-index', '2147483600');",
            "      setImportant(shell, 'overflow', 'visible');",
            "      setImportant(sidebar, 'position', 'relative');",
            "      setImportant(sidebar, 'left', '0px');",
            "      setImportant(sidebar, 'right', 'auto');",
            "      setImportant(sidebar, 'top', '0px');",
            "      setImportant(sidebar, 'bottom', 'auto');",
            "      setImportant(sidebar, 'width', '100%');",
            "      setImportant(sidebar, 'max-width', '100%');",
            "      setImportant(sidebar, 'min-width', '0');",
            "      setImportant(sidebar, 'height', '100%');",
            "      setImportant(sidebar, 'min-height', '0');",
            "      setImportant(sidebar, 'transform', 'none');",
            "      setImportant(sidebar, 'translate', 'none');",
            "      setImportant(sidebar, 'margin', '0');",
            "      setImportant(sidebar, 'display', 'block');",
            "      setImportant(sidebar, 'visibility', 'visible');",
            "      setImportant(sidebar, 'opacity', '1');",
            "      setImportant(sidebar, 'pointer-events', 'auto');",
            "      setImportant(sidebar, 'z-index', '2147483600');",
            "      setImportant(sidebar, 'background', 'var(--background,#fff)');",
            "      setImportant(sidebar, 'box-shadow', '0 18px 48px rgba(15,23,42,.24)');",
            "      setImportant(sidebar, 'overflow', 'auto');",
            "    }",
            "    window.__hermesAndroidToggleSidebar = function(open) {",
            "      var doc = document.documentElement;",
            "      var next = typeof open === 'boolean' ? open : !doc.classList.contains('hermes-mobile-sidebar-open');",
            "      doc.classList.toggle('hermes-mobile-sidebar-open', next);",
            "      applyHermesMobileChromeTweaks();",
            "      forceHermesMobileSidebarPosition(next);",
            "      window.__hermesAndroidEvents = window.__hermesAndroidEvents || [];",
            "      var sidebar = document.querySelector('#root [data-slot=\"sidebar\"]');",
            "      var shell = document.querySelector('#root [data-hermes-mobile-sidebar-shell=\"true\"]');",
            "      window.__hermesAndroidEvents.push({ at: new Date().toISOString(), name: 'sidebar-toggle', detail: { open: next, sidebar: !!sidebar, shell: !!shell, sidebarRect: sidebar ? JSON.stringify(sidebar.getBoundingClientRect()) : null } });",
            "    };",
            "    window.__hermesAndroidSetInsets = function(top, right, bottom, left) {",
            "      var dpr = window.devicePixelRatio || 1;",
            "      var doc = document.documentElement;",
            "      doc.style.setProperty('--hermes-safe-top', Math.ceil((top || 0) / dpr) + 'px');",
            "      doc.style.setProperty('--hermes-safe-right', Math.ceil((right || 0) / dpr) + 'px');",
            "      doc.style.setProperty('--hermes-safe-bottom', Math.ceil((bottom || 0) / dpr) + 'px');",
            "      doc.style.setProperty('--hermes-safe-left', Math.ceil((left || 0) / dpr) + 'px');",
            "    };",
            "    window.__hermesAndroidSetInsets(" + safeTopPx + "," + safeRightPx + "," + safeBottomPx + "," + safeLeftPx + ");",
            "    syncHermesViewport();",
            "    applyHermesMobileChromeTweaks();",
            "    installTerminalReturnButton();",
            "    if (!window.__hermesAndroidViewportInstalled) {",
            "      window.__hermesAndroidViewportInstalled = true;",
            "      window.addEventListener('resize', syncHermesViewport, { passive: true });",
            "      window.addEventListener('orientationchange', function(){ setTimeout(syncHermesViewport, 120); }, { passive: true });",
            "      new MutationObserver(function(){ window.requestAnimationFrame(function(){ applyHermesMobileChromeTweaks(); forceHermesMobileSidebarPosition(document.documentElement.classList.contains('hermes-mobile-sidebar-open')); }); }).observe(document.documentElement, { childList: true, subtree: true });",
            "      if (window.visualViewport) {",
            "        window.visualViewport.addEventListener('resize', syncHermesViewport, { passive: true });",
            "        window.visualViewport.addEventListener('scroll', syncHermesViewport, { passive: true });",
            "      }",
            "    }",
            "  } catch (e) {",
            "    console.warn('Hermes Android mobile tweaks failed', e);",
            "  }",
            "})();"
        );
    }

    private class HermesAndroidBridge {
        @JavascriptInterface
        public String getAndroidAdbStatus() {
            return androidAdbManager.status().toString();
        }

        @JavascriptInterface
        public String pairAndroidAdb(String host, int port, String pairingCode) {
            return androidAdbManager.pair(host, port, pairingCode).toString();
        }

        @JavascriptInterface
        public String connectAndroidAdb(String host, int port) {
            return androidAdbManager.connect(host, port).toString();
        }

        @JavascriptInterface
        public String runAndroidAdbShell(String serial, String command) {
            return androidAdbManager.shell(serial, command).toString();
        }

        @JavascriptInterface
        public boolean openDeveloperOptions() {
            return openAndroidSettings(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS);
        }

        @JavascriptInterface
        public boolean openWirelessDebuggingSettings() {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
                return openDeveloperOptions();
            }
            String manufacturer = String.valueOf(Build.MANUFACTURER).toLowerCase(Locale.ROOT);
            if ((manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco"))
                    && openWirelessDebuggingSubSettings()) {
                return true;
            }
            if (openAndroidSettings("android.settings.WIRELESS_DEBUGGING_SETTINGS")) {
                return true;
            }
            if (openWirelessDebuggingSubSettings()) {
                return true;
            }
            return openDeveloperOptions();
        }

        private boolean openWirelessDebuggingSubSettings() {
            try {
                Intent intent = new Intent();
                intent.setClassName("com.android.settings", "com.android.settings.SubSettings");
                intent.putExtra(":settings:show_fragment", "com.android.settings.development.WirelessDebuggingFragment");
                intent.putExtra(":settings:show_fragment_title", "无线调试");
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    intent.addFlags(Intent.FLAG_ACTIVITY_LAUNCH_ADJACENT);
                }
                startActivity(intent);
                return true;
            } catch (Exception error) {
                Log.w(TAG, "Failed to open Wireless Debugging sub-settings", error);
                return false;
            }
        }

        private boolean openAndroidSettings(String action) {
            try {
                Intent intent = new Intent(action);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    intent.addFlags(Intent.FLAG_ACTIVITY_LAUNCH_ADJACENT);
                }
                startActivity(intent);
                return true;
            } catch (Exception error) {
                Log.w(TAG, "Failed to open Android settings: " + action, error);
                return false;
            }
        }

        @JavascriptInterface
        public boolean isEmbeddedAgentAvailable() {
            try {
                JSONObject status = new JSONObject(
                    callEmbeddedBackend("initialize", getFilesDir().getAbsolutePath(), EMBEDDED_AGENT_PORT)
                );
                return status.optBoolean("available", false) && status.optBoolean("ok", false);
            } catch (Exception e) {
                Log.w(TAG, "Embedded Hermes availability check failed", e);
                return false;
            }
        }

        @JavascriptInterface
        public String getEmbeddedAgentStatus() {
            return callEmbeddedBackend("status");
        }

        @JavascriptInterface
        public String startEmbeddedAgent() {
            HermesForegroundService.start(MainActivity.this);
            return callEmbeddedBackend("start", getFilesDir().getAbsolutePath(), EMBEDDED_AGENT_PORT);
        }

        @JavascriptInterface
        public String getLocalModelStatus() {
            return LocalModelManager.statusJson();
        }

        @JavascriptInterface
        public String downloadLocalModel(String modelId) {
            return LocalModelManager.download(modelId);
        }

        @JavascriptInterface
        public String cancelLocalModelDownload() {
            return LocalModelManager.cancelDownload();
        }

        @JavascriptInterface
        public String startLocalModel(String modelId) {
            HermesForegroundService.start(MainActivity.this);
            return LocalModelManager.start(modelId);
        }

        @JavascriptInterface
        public String stopLocalModel() {
            return LocalModelManager.stop();
        }

        @JavascriptInterface
        public String deleteLocalModel(String modelId) {
            return LocalModelManager.deleteModel(modelId);
        }

        @JavascriptInterface
        public String getGitHubStatus() { return GitHubConnector.statusJson(); }

        @JavascriptInterface
        public String connectGitHub(String personalAccessToken) { return GitHubConnector.connect(personalAccessToken); }

        @JavascriptInterface
        public String disconnectGitHub() { return GitHubConnector.disconnect(); }

        @JavascriptInterface
        public String listGitHubRepositories() { return GitHubConnector.listRepositories(); }

        @JavascriptInterface
        public String listGitHubTree(String repository, String reference) { return GitHubConnector.listTree(repository, reference); }

        @JavascriptInterface
        public String readGitHubFile(String repository, String path, String reference) { return GitHubConnector.readFile(repository, path, reference); }

        @JavascriptInterface
        public String proposeGitHubChanges(String repository, String branch, String changesJson, String commitMessage) {
            return GitHubConnector.createUploadProposal(repository, branch, changesJson, commitMessage);
        }

        @JavascriptInterface
        public String listPendingGitHubProposals() { return GitHubConnector.listPendingProposals(); }

        @JavascriptInterface
        public String approveGitHubProposal(String proposalId) { return GitHubConnector.approveProposal(proposalId); }

        @JavascriptInterface
        public String discardGitHubProposal(String proposalId) { return GitHubConnector.discardProposal(proposalId); }

        @JavascriptInterface
        public String listGitHubWorkflowRuns(String repository, String branch) {
            return GitHubConnector.listWorkflowRuns(repository, branch);
        }

        @JavascriptInterface
        public String listGitHubWorkflows(String repository) {
            return GitHubConnector.listWorkflows(repository);
        }

        @JavascriptInterface
        public String proposeGitHubWorkflowRun(String repository, String workflowId, String branch, String inputsJson) {
            return GitHubConnector.createWorkflowRunProposal(repository, workflowId, branch, inputsJson);
        }

        @JavascriptInterface
        public boolean stopHermesBackgroundRuntime() {
            Intent intent = new Intent(MainActivity.this, HermesForegroundService.class)
                    .setAction(HermesForegroundService.ACTION_STOP);
            try {
                startService(intent);
                return true;
            } catch (Exception error) {
                Log.w(TAG, "Could not stop the foreground runtime");
                return false;
            }
        }

        @JavascriptInterface
        public boolean returnToMobileHome() {
            if (bridge == null || bridge.getWebView() == null) {
                return false;
            }
            runOnUiThread(() -> bridge.getWebView().loadUrl("https://localhost/"));
            return true;
        }

        @JavascriptInterface
        public String getDashboardSessionToken() {
            HttpURLConnection connection = null;
            try {
                URL url = new URL("http://127.0.0.1:" + EMBEDDED_AGENT_PORT + "/?locale=ar");
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(5000);
                connection.setReadTimeout(5000);
                String body = readAll(connection.getInputStream());
                String marker = "window.__HERMES_SESSION_TOKEN__=\"";
                int start = body.indexOf(marker);
                if (start < 0) {
                    return "";
                }
                start += marker.length();
                int end = body.indexOf("\"", start);
                if (end <= start) {
                    return "";
                }
                return body.substring(start, end);
            } catch (Exception e) {
                Log.w(TAG, "Failed to read dashboard session token", e);
                return "";
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        }

        @JavascriptInterface
        public String dashboardRequest(String method, String path, String bodyJson, boolean requireToken, int timeoutMs) {
            JSONObject result = new JSONObject();
            HttpURLConnection connection = null;
            try {
                String safeMethod = method == null || method.trim().isEmpty()
                    ? "GET"
                    : method.trim().toUpperCase(Locale.ROOT);
                String safePath = path == null || path.trim().isEmpty()
                    ? "/api/status"
                    : path.trim();
                if (!safePath.startsWith("/api/")) {
                    throw new IllegalArgumentException("Only local Hermes API paths are allowed");
                }
                int timeout = timeoutMs > 0 ? timeoutMs : 15000;
                URL url = new URL("http://127.0.0.1:" + EMBEDDED_AGENT_PORT + safePath);
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod(safeMethod);
                connection.setConnectTimeout(timeout);
                connection.setReadTimeout(timeout);
                connection.setRequestProperty("Accept", "application/json");
                if (requireToken) {
                    String token = getDashboardSessionToken();
                    if (token == null || token.trim().isEmpty()) {
                        throw new IllegalStateException("Dashboard session token unavailable");
                    }
                    connection.setRequestProperty("X-Hermes-Session-Token", token);
                }
                if (!"GET".equals(safeMethod) && bodyJson != null && !bodyJson.isEmpty()) {
                    byte[] body = bodyJson.getBytes(StandardCharsets.UTF_8);
                    connection.setDoOutput(true);
                    connection.setRequestProperty("Content-Type", "application/json");
                    connection.setFixedLengthStreamingMode(body.length);
                    try (OutputStream stream = connection.getOutputStream()) {
                        stream.write(body);
                    }
                }
                int status = connection.getResponseCode();
                InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
                String responseBody = readAll(stream);
                result.put("ok", status >= 200 && status < 300);
                result.put("status", status);
                result.put("body", responseBody == null ? "" : responseBody);
                try {
                    result.put("json", responseBody == null || responseBody.isEmpty() ? new JSONObject() : new JSONObject(responseBody));
                } catch (Exception ignored) {
                    // Non-JSON bodies stay in body.
                }
            } catch (Exception e) {
                try {
                    result.put("ok", false);
                    result.put("status", 0);
                    result.put("error", e.getMessage() == null ? e.toString() : e.getMessage());
                } catch (Exception ignored) {
                    // ignore
                }
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
            return result.toString();
        }

        @JavascriptInterface
        public String runEmbeddedAgentCommand(String commandJson) {
            return callEmbeddedBackend(
                "run_command",
                commandJson == null ? "{}" : commandJson,
                getFilesDir().getAbsolutePath(),
                EMBEDDED_AGENT_PORT
            );
        }

        @JavascriptInterface
        public String callOpenAiChat(String requestJson, int timeoutMs) {
            JSONObject result = new JSONObject();
            HttpURLConnection connection = null;
            try {
                JSONObject request = new JSONObject(requestJson == null ? "{}" : requestJson);
                String baseUrl = request.optString("baseUrl", "").trim();
                String apiKey = request.optString("apiKey", "").trim();
                String model = request.optString("model", "").trim();
                boolean nativeLocalModel = ("http://127.0.0.1:" + LocalModelManager.SERVER_PORT + "/v1").equals(baseUrl);
                if (nativeLocalModel) {
                    JSONObject local = new JSONObject(LocalModelManager.activeProviderConfigJson());
                    apiKey = local.optString("api_key", "");
                    model = local.optString("model_id", "");
                }
                JSONArray messages = request.optJSONArray("messages");
                if (baseUrl.isEmpty()) {
                    throw new IllegalArgumentException("يرجى إدخال عنوان API");
                }
                if (!baseUrl.startsWith("https://") && !baseUrl.startsWith("http://")) {
                    throw new IllegalArgumentException("يجب أن يبدأ عنوان API بـ https://");
                }
                if (apiKey.isEmpty()) {
                    throw new IllegalArgumentException("يرجى إدخال مفتاح API");
                }
                if (model.isEmpty()) {
                    throw new IllegalArgumentException("يرجى إدخال اسم النموذج");
                }
                if (messages == null || messages.length() == 0) {
                    throw new IllegalArgumentException("لا يمكن إرسال محادثة فارغة");
                }

                String normalizedBase = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
                URL url = new URL(normalizedBase + "/chat/completions");
                String host = url.getHost() == null ? "" : url.getHost().toLowerCase(Locale.ROOT);
                boolean loopback = host.equals("localhost") || host.equals("127.0.0.1")
                    || host.equals("::1") || host.equals("[::1]");
                if (url.getUserInfo() != null || url.getQuery() != null || url.getRef() != null) {
                    throw new IllegalArgumentException("لا تضع بيانات اعتماد أو معاملات سرية داخل رابط API");
                }
                if (!"https".equalsIgnoreCase(url.getProtocol()) && !(loopback && "http".equalsIgnoreCase(url.getProtocol()))) {
                    throw new IllegalArgumentException("الاتصال الخارجي يتطلب HTTPS؛ يسمح بـ HTTP على الهاتف المحلي فقط");
                }
                JSONObject payload = new JSONObject();
                payload.put("model", model);
                payload.put("messages", messages);
                payload.put("temperature", request.optDouble("temperature", 0.7));
                payload.put("stream", false);
                byte[] body = payload.toString().getBytes(StandardCharsets.UTF_8);

                connection = (HttpURLConnection) url.openConnection();
                connection.setInstanceFollowRedirects(false);
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(timeoutMs > 0 ? timeoutMs : 60000);
                connection.setReadTimeout(timeoutMs > 0 ? timeoutMs : 60000);
                connection.setDoOutput(true);
                connection.setRequestProperty("Accept", "application/json");
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setRequestProperty("Authorization", "Bearer " + apiKey);
                connection.setFixedLengthStreamingMode(body.length);
                try (OutputStream stream = connection.getOutputStream()) {
                    stream.write(body);
                }

                int status = connection.getResponseCode();
                InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
                String responseBody = readAll(stream);
                result.put("ok", status >= 200 && status < 300);
                result.put("status", status);
                result.put("body", responseBody);
                if (status < 200 || status >= 300) {
                    result.put("error", "API 请求失败: HTTP " + status);
                }
            } catch (Exception e) {
                try {
                    result.put("ok", false);
                    result.put("status", 0);
                    result.put("error", e.getMessage());
                    result.put("body", "");
                } catch (Exception ignored) {
                    // ignore
                }
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
            return result.toString();
        }

        @JavascriptInterface
        public String getMobileChatConfig() {
            JSONObject result = new JSONObject();
            try {
                JSONObject stored = readMobileChatStoredConfig();
                String apiKey = getStoredMobileChatApiKey(stored);
                result.put("apiKey", "");
                result.put("hasApiKey", !apiKey.isEmpty());
                result.put("baseUrl", stored.optString("baseUrl", ""));
                result.put("model", stored.optString("model", ""));
            } catch (Exception e) {
                try {
                    result.put("apiKey", "");
                    result.put("hasApiKey", false);
                    result.put("baseUrl", "");
                    result.put("model", "");
                    result.put("error", "تعذّر فتح الإعدادات المشفّرة");
                } catch (Exception ignored) {
                    // ignore
                }
            }
            return result.toString();
        }

        private JSONObject readMobileChatStoredConfig() throws Exception {
            File file = new File(getFilesDir(), "mobile_chat_config.json");
            if (!file.exists()) {
                return new JSONObject();
            }
            try (FileInputStream stream = new FileInputStream(file)) {
                String content = readAll(stream);
                return content == null || content.trim().isEmpty() ? new JSONObject() : new JSONObject(content);
            }
        }

        private void writeMobileChatStoredConfig(JSONObject stored) throws Exception {
            try (FileOutputStream stream = openFileOutput("mobile_chat_config.json", Context.MODE_PRIVATE)) {
                stream.write(stored.toString().getBytes(StandardCharsets.UTF_8));
                stream.flush();
            }
        }

        private SecretKey getMobileChatSecretKey() throws Exception {
            final String alias = "com.hoodmoshla.hermesarabic.mobile-chat.v1";
            KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
            keyStore.load(null);
            if (keyStore.containsAlias(alias)) {
                return (SecretKey) keyStore.getKey(alias, null);
            }
            KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(alias,
                    KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .setKeySize(256)
                .build());
            return generator.generateKey();
        }

        private String encryptMobileChatApiKey(String plainText) throws Exception {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, getMobileChatSecretKey());
            byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            return "v1:" + Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP)
                + ":" + Base64.encodeToString(encrypted, Base64.NO_WRAP);
        }

        private String decryptMobileChatApiKey(String encoded) throws Exception {
            String[] parts = encoded.split(":", 3);
            if (parts.length != 3 || !"v1".equals(parts[0])) {
                throw new IllegalArgumentException("صيغة المفتاح المشفّر غير مدعومة");
            }
            byte[] iv = Base64.decode(parts[1], Base64.NO_WRAP);
            byte[] ciphertext = Base64.decode(parts[2], Base64.NO_WRAP);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, getMobileChatSecretKey(), new GCMParameterSpec(128, iv));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        }

        private String getStoredMobileChatApiKey(JSONObject stored) throws Exception {
            String encrypted = stored.optString("apiKeyEncrypted", "");
            if (!encrypted.isEmpty()) {
                return decryptMobileChatApiKey(encrypted);
            }
            String legacyPlainText = stored.optString("apiKey", "");
            if (!legacyPlainText.isEmpty()) {
                stored.remove("apiKey");
                stored.put("apiKeyEncrypted", encryptMobileChatApiKey(legacyPlainText));
                writeMobileChatStoredConfig(stored);
                return legacyPlainText;
            }
            return "";
        }

        @JavascriptInterface
        public boolean saveMobileChatConfig(String configJson) {
            try {
                JSONObject parsed = new JSONObject(configJson == null ? "{}" : configJson);
                JSONObject stored = readMobileChatStoredConfig();
                if (parsed.optBoolean("clearApiKey", false)) {
                    stored.remove("apiKey");
                    stored.remove("apiKeyEncrypted");
                } else if (parsed.has("apiKey") && !parsed.optString("apiKey", "").trim().isEmpty()) {
                    String apiKey = parsed.optString("apiKey", "").trim();
                    stored.remove("apiKey");
                    stored.remove("apiKeyEncrypted");
                    stored.put("apiKeyEncrypted", encryptMobileChatApiKey(apiKey));
                } else {
                    getStoredMobileChatApiKey(stored);
                }
                if (parsed.has("baseUrl")) stored.put("baseUrl", parsed.optString("baseUrl", ""));
                if (parsed.has("model")) stored.put("model", parsed.optString("model", ""));
                writeMobileChatStoredConfig(stored);
                return true;
            } catch (Exception e) {
                Log.w(TAG, "Failed to save encrypted mobile chat config", e);
                return false;
            }
        }

        @JavascriptInterface
        public boolean requestMicrophoneAccess(int timeoutMs) {
            return requestMicrophoneAccessBlocking(timeoutMs > 0 ? timeoutMs : 60000);
        }

        @JavascriptInterface
        public boolean showSoftKeyboard() {
            runOnUiThread(() -> {
                WebView webView = bridge == null ? null : bridge.getWebView();
                if (webView == null) {
                    return;
                }
                webView.requestFocus();
                InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                if (imm != null) {
                    imm.showSoftInput(webView, InputMethodManager.SHOW_IMPLICIT);
                }
            });
            return true;
        }

        @JavascriptInterface
        public String speakText(String optionsJson, int timeoutMs) {
            JSONObject result = new JSONObject();
            try {
                JSONObject options = optionsJson == null || optionsJson.isEmpty()
                    ? new JSONObject()
                    : new JSONObject(optionsJson);
                String text = options.optString("text", "").trim();
                String language = options.optString("language", "ar").trim();
                speakTextBlocking(text, language, timeoutMs > 0 ? timeoutMs : 30000);
                result.put("ok", true);
                result.put("error", "");
            } catch (Exception e) {
                try {
                    result.put("ok", false);
                    result.put("error", e.getMessage());
                } catch (Exception ignored) {
                    // ignore
                }
            }
            return result.toString();
        }

        @JavascriptInterface
        public boolean stopSpeaking() {
            runOnUiThread(() -> {
                if (textToSpeech != null) {
                    try {
                        textToSpeech.stop();
                    } catch (Exception ignored) {
                        // ignore
                    }
                }
            });
            return true;
        }

        @JavascriptInterface
        public boolean openExternalUrl(String url) {
            if (url == null || url.trim().isEmpty()) {
                return false;
            }
            final boolean[] started = new boolean[]{false};
            CountDownLatch latch = new CountDownLatch(1);
            runOnUiThread(() -> {
                try {
                    Uri uri = Uri.parse(url);
                    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                    startActivity(intent);
                    started[0] = true;
                } catch (Exception e) {
                    Log.w(TAG, "Failed to open external url from JS: " + url, e);
                } finally {
                    latch.countDown();
                }
            });
            try {
                latch.await(2, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return started[0];
        }

        @JavascriptInterface
        public String recordSpeechText(String optionsJson, int timeoutMs) {
            JSONObject result = new JSONObject();
            try {
                String text = recordSpeechTextBlocking(optionsJson, timeoutMs > 0 ? timeoutMs : 60000);
                result.put("ok", true);
                result.put("text", text == null ? "" : text);
            } catch (Exception e) {
                try {
                    result.put("ok", false);
                    result.put("error", e.getMessage());
                    result.put("text", "");
                } catch (Exception ignored) {
                    // ignore
                }
            }
            return result.toString();
        }

        @JavascriptInterface
        public String selectPaths(String optionsJson, int timeoutMs) {
            JSONObject result = new JSONObject();
            try {
                ArrayList<String> paths = selectPathsBlocking(optionsJson, timeoutMs > 0 ? timeoutMs : 120000);
                result.put("ok", true);
                result.put("paths", new org.json.JSONArray(paths));
            } catch (Exception e) {
                try {
                    result.put("ok", false);
                    result.put("error", e.getMessage());
                    result.put("paths", new org.json.JSONArray());
                } catch (Exception ignored) {
                    // ignore
                }
            }
            return result.toString();
        }

        @JavascriptInterface
        public String capturePhoto(int timeoutMs) {
            JSONObject result = new JSONObject();
            try {
                String path = capturePhotoBlocking(timeoutMs > 0 ? timeoutMs : 120000);
                result.put("ok", true);
                result.put("path", path);
            } catch (Exception e) {
                try {
                    result.put("ok", false);
                    result.put("error", e.getMessage());
                    result.put("path", "");
                } catch (Exception ignored) {
                    // ignore
                }
            }
            return result.toString();
        }

        @JavascriptInterface
        public String readFileDataUrl(String path) {
            JSONObject result = new JSONObject();
            try {
                File file = new File(path == null ? "" : path);
                if (!file.isFile()) {
                    throw new IllegalArgumentException("File not found");
                }
                String mime = URLConnection.guessContentTypeFromName(file.getName());
                if (mime == null || mime.isEmpty()) {
                    mime = "application/octet-stream";
                }
                byte[] data;
                try (InputStream in = new FileInputStream(file)) {
                    data = readBytes(in);
                }
                result.put("ok", true);
                result.put("dataUrl", "data:" + mime + ";base64," + Base64.encodeToString(data, Base64.NO_WRAP));
            } catch (Exception e) {
                try {
                    result.put("ok", false);
                    result.put("error", e.getMessage());
                    result.put("dataUrl", "");
                } catch (Exception ignored) {
                    // ignore
                }
            }
            return result.toString();
        }

        @JavascriptInterface
        public String readImagePreviewDataUrl(String path) {
            JSONObject result = new JSONObject();
            Bitmap bitmap = null;
            try {
                File file = new File(path == null ? "" : path);
                if (!file.isFile()) {
                    throw new IllegalArgumentException("تعذر العثور على ملف الصورة.");
                }
                if (file.length() > 30L * 1024L * 1024L) {
                    throw new IllegalArgumentException("حجم الصورة كبير لعرض معاينة سريعة.");
                }
                BitmapFactory.Options bounds = new BitmapFactory.Options();
                bounds.inJustDecodeBounds = true;
                BitmapFactory.decodeFile(file.getAbsolutePath(), bounds);
                if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
                    throw new IllegalArgumentException("صيغة الصورة غير مدعومة للمعاينة.");
                }
                int longestSide = Math.max(bounds.outWidth, bounds.outHeight);
                int sampleSize = 1;
                while (longestSide / sampleSize > 640) {
                    sampleSize *= 2;
                }
                BitmapFactory.Options options = new BitmapFactory.Options();
                options.inSampleSize = sampleSize;
                options.inPreferredConfig = Bitmap.Config.RGB_565;
                bitmap = BitmapFactory.decodeFile(file.getAbsolutePath(), options);
                if (bitmap == null) {
                    throw new IllegalArgumentException("تعذرت قراءة الصورة للمعاينة.");
                }
                ByteArrayOutputStream output = new ByteArrayOutputStream();
                if (!bitmap.compress(Bitmap.CompressFormat.JPEG, 78, output)) {
                    throw new IllegalStateException("تعذر تجهيز معاينة الصورة.");
                }
                result.put("ok", true);
                result.put("dataUrl", "data:image/jpeg;base64," + Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP));
            } catch (Exception e) {
                try {
                    result.put("ok", false);
                    result.put("error", e.getMessage() == null ? "تعذرت معاينة الصورة." : e.getMessage());
                    result.put("dataUrl", "");
                } catch (Exception ignored) {
                    // ignore
                }
            } finally {
                if (bitmap != null && !bitmap.isRecycled()) {
                    bitmap.recycle();
                }
            }
            return result.toString();
        }

        private static String readAll(InputStream stream) throws Exception {
            if (stream == null) {
                return "";
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int read;
            while ((read = stream.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
            return out.toString(StandardCharsets.UTF_8.name());
        }

        private static byte[] readBytes(InputStream stream) throws Exception {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int read;
            while ((read = stream.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
            return out.toByteArray();
        }
    }

    private boolean hasRecordAudioPermission() {
        return checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }

    private void speakTextBlocking(String text, String language, int timeoutMs) throws Exception {
        if (text == null || text.trim().isEmpty()) {
            throw new IllegalArgumentException("لا يوجد نص لقراءته.");
        }

        ensureTextToSpeechReady(Math.max(1000, timeoutMs));
        String utteranceId = "hermes-mobile-tts-" + System.currentTimeMillis();
        CountDownLatch speakLatch = new CountDownLatch(1);
        final String[] error = new String[]{""};
        String finalText = text.trim();
        String finalLanguage = language == null || language.trim().isEmpty() ? "ar" : language.trim();

        runOnUiThread(() -> {
            try {
                if (textToSpeech == null || !textToSpeechReady) {
                    error[0] = "القراءة الصوتية غير متاحة.";
                    return;
                }
                Locale locale = Locale.forLanguageTag(finalLanguage);
                if (locale.getLanguage().isEmpty()) {
                    locale = Locale.getDefault();
                }
                int languageResult = textToSpeech.setLanguage(locale);
                if (languageResult == TextToSpeech.LANG_MISSING_DATA || languageResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                    textToSpeech.setLanguage(Locale.getDefault());
                }
                int speakResult = textToSpeech.speak(finalText, TextToSpeech.QUEUE_FLUSH, null, utteranceId);
                if (speakResult == TextToSpeech.ERROR) {
                    error[0] = "تعذّر بدء القراءة الصوتية.";
                }
            } catch (Exception e) {
                error[0] = e.getMessage();
            } finally {
                speakLatch.countDown();
            }
        });

        boolean queued = speakLatch.await(2, TimeUnit.SECONDS);
        if (!queued) {
            throw new IllegalStateException("语音播报启动超时");
        }
        if (error[0] != null && !error[0].isEmpty()) {
            throw new IllegalStateException(error[0]);
        }
    }

    private void ensureTextToSpeechReady(int timeoutMs) throws Exception {
        if (textToSpeech != null && textToSpeechReady) {
            return;
        }

        CountDownLatch initLatch = new CountDownLatch(1);
        final String[] error = new String[]{""};
        runOnUiThread(() -> {
            try {
                textToSpeechReady = false;
                if (textToSpeech != null) {
                    try {
                        textToSpeech.shutdown();
                    } catch (Exception ignored) {
                        // ignore
                    }
                    textToSpeech = null;
                }
                textToSpeech = new TextToSpeech(this, status -> {
                    if (status == TextToSpeech.SUCCESS) {
                        textToSpeechReady = true;
                        textToSpeech.setSpeechRate(1.0f);
                        int languageResult = textToSpeech.setLanguage(Locale.SIMPLIFIED_CHINESE);
                        if (languageResult == TextToSpeech.LANG_MISSING_DATA || languageResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                            textToSpeech.setLanguage(Locale.getDefault());
                        }
                    } else {
                        error[0] = "语音播报初始化失败";
                    }
                    initLatch.countDown();
                });
            } catch (Exception e) {
                error[0] = e.getMessage();
                initLatch.countDown();
            }
        });

        boolean ready = initLatch.await(timeoutMs, TimeUnit.MILLISECONDS);
        if (!ready) {
            throw new IllegalStateException("语音播报初始化超时");
        }
        if (error[0] != null && !error[0].isEmpty()) {
            throw new IllegalStateException(error[0]);
        }
        if (textToSpeech == null || !textToSpeechReady) {
            throw new IllegalStateException("语音播报不可用");
        }
    }

    private boolean requestMicrophoneAccessBlocking(int timeoutMs) {
        if (hasRecordAudioPermission()) {
            return true;
        }
        CountDownLatch latch = new CountDownLatch(1);
        microphoneLatch = latch;
        microphoneGranted = false;
        runOnUiThread(() -> requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_RECORD_AUDIO));
        try {
            latch.await(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return microphoneGranted || hasRecordAudioPermission();
    }

    private String recordSpeechTextBlocking(String optionsJson, int timeoutMs) throws Exception {
        if (!requestMicrophoneAccessBlocking(Math.min(timeoutMs, 60000))) {
            throw new IllegalStateException("Microphone permission denied");
        }

        String language = "ar";
        String prompt = "الإملاء الصوتي";
        try {
            JSONObject options = optionsJson == null || optionsJson.isEmpty() ? new JSONObject() : new JSONObject(optionsJson);
            String requestedLanguage = options.optString("language", "");
            String requestedPrompt = options.optString("prompt", "");
            if (!requestedLanguage.trim().isEmpty()) {
                language = requestedLanguage;
            }
            if (!requestedPrompt.trim().isEmpty()) {
                prompt = requestedPrompt;
            }
        } catch (Exception ignored) {
            // Keep defaults.
        }

        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            try {
                return recordSpeechTextWithActivityBlocking(language, prompt, Math.max(1000, timeoutMs));
            } catch (ActivityNotFoundException e) {
                throw new IllegalStateException("Speech recognition is not available on this device");
            }
        }

        CountDownLatch latch = new CountDownLatch(1);
        speechLatch = latch;
        speechText = "";
        speechError = "";
        String finalLanguage = language;
        String finalPrompt = prompt;

        runOnUiThread(() -> {
            try {
                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, finalLanguage);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, finalLanguage);
                intent.putExtra(RecognizerIntent.EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE, false);
                intent.putExtra(RecognizerIntent.EXTRA_PROMPT, finalPrompt);
                intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
                intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1800L);
                intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 1200L);
                intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 2500L);

                destroyActiveSpeechRecognizer();
                activeSpeechRecognizer = SpeechRecognizer.createSpeechRecognizer(this);
                activeSpeechRecognizer.setRecognitionListener(new RecognitionListener() {
                    @Override
                    public void onReadyForSpeech(Bundle params) {
                        Log.i(TAG, "SpeechRecognizer ready");
                    }

                    @Override
                    public void onBeginningOfSpeech() {
                        Log.i(TAG, "SpeechRecognizer beginning of speech");
                    }

                    @Override
                    public void onRmsChanged(float rmsdB) {
                        // no-op
                    }

                    @Override
                    public void onBufferReceived(byte[] buffer) {
                        // no-op
                    }

                    @Override
                    public void onEndOfSpeech() {
                        Log.i(TAG, "SpeechRecognizer end of speech");
                    }

                    @Override
                    public void onError(int error) {
                        speechError = speechRecognizerError(error);
                        Log.w(TAG, "SpeechRecognizer error: " + speechError);
                        finishSpeechRecognition(speechText);
                    }

                    @Override
                    public void onResults(Bundle results) {
                        ArrayList<String> matches = results == null
                            ? null
                            : results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        finishSpeechRecognition(matches != null && !matches.isEmpty() ? matches.get(0) : "");
                    }

                    @Override
                    public void onPartialResults(Bundle partialResults) {
                        ArrayList<String> matches = partialResults == null
                            ? null
                            : partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        if (matches != null && !matches.isEmpty()) {
                            speechText = matches.get(0) == null ? "" : matches.get(0);
                        }
                    }

                    @Override
                    public void onEvent(int eventType, Bundle params) {
                        // no-op
                    }
                });
                activeSpeechRecognizer.startListening(intent);
            } catch (Exception e) {
                speechError = e.getMessage();
                finishSpeechRecognition("");
            }
        });

        boolean completed = latch.await(timeoutMs, TimeUnit.MILLISECONDS);
        if (!completed) {
            runOnUiThread(() -> {
                if (activeSpeechRecognizer != null) {
                    activeSpeechRecognizer.cancel();
                }
                destroyActiveSpeechRecognizer();
            });
            throw new IllegalStateException("Speech recognition timed out");
        }
        if (speechText == null || speechText.trim().isEmpty()) {
            Log.w(TAG, "Speech recognition returned no text" + (speechError == null || speechError.isEmpty() ? "" : ": " + speechError));
            try {
                return recordSpeechTextWithActivityBlocking(language, prompt, Math.max(1000, timeoutMs));
            } catch (ActivityNotFoundException e) {
                Log.w(TAG, "Speech recognizer activity unavailable after direct recognition", e);
            }
        }
        return speechText == null ? "" : speechText;
    }

    private String recordSpeechTextWithActivityBlocking(String language, String prompt, int timeoutMs) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        speechLatch = latch;
        speechText = "";
        speechError = "";
        runOnUiThread(() -> {
            try {
                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, language);
                intent.putExtra(RecognizerIntent.EXTRA_PROMPT, prompt);
                intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
                startActivityForResult(intent, REQ_SPEECH_TEXT);
            } catch (ActivityNotFoundException e) {
                speechError = "activity_not_found";
                Log.w(TAG, "Speech recognizer activity unavailable", e);
                CountDownLatch currentLatch = speechLatch;
                speechLatch = null;
                if (currentLatch != null) {
                    currentLatch.countDown();
                }
            } catch (Exception e) {
                speechError = e.getMessage();
                Log.w(TAG, "Failed to start speech recognizer activity", e);
                CountDownLatch currentLatch = speechLatch;
                speechLatch = null;
                if (currentLatch != null) {
                    currentLatch.countDown();
                }
            }
        });

        boolean completed = latch.await(timeoutMs, TimeUnit.MILLISECONDS);
        if (!completed) {
            throw new IllegalStateException("Speech recognition timed out");
        }
        if ("activity_not_found".equals(speechError)) {
            throw new ActivityNotFoundException("Speech recognizer activity unavailable");
        }
        if (speechError != null && !speechError.isEmpty() && (speechText == null || speechText.trim().isEmpty())) {
            throw new IllegalStateException(speechError);
        }
        return speechText == null ? "" : speechText;
    }

    private void finishSpeechRecognition(String text) {
        speechText = text == null ? "" : text;
        destroyActiveSpeechRecognizer();
        CountDownLatch latch = speechLatch;
        speechLatch = null;
        if (latch != null) {
            latch.countDown();
        }
    }

    private void destroyActiveSpeechRecognizer() {
        if (activeSpeechRecognizer != null) {
            try {
                activeSpeechRecognizer.destroy();
            } catch (Exception ignored) {
                // ignore
            }
            activeSpeechRecognizer = null;
        }
    }

    private static String speechRecognizerError(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_AUDIO:
                return "audio";
            case SpeechRecognizer.ERROR_CLIENT:
                return "client";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                return "insufficient_permissions";
            case SpeechRecognizer.ERROR_NETWORK:
                return "network";
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                return "network_timeout";
            case SpeechRecognizer.ERROR_NO_MATCH:
                return "no_match";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                return "recognizer_busy";
            case SpeechRecognizer.ERROR_SERVER:
                return "server";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                return "speech_timeout";
            default:
                return "unknown_" + error;
        }
    }

    private ArrayList<String> selectPathsBlocking(String optionsJson, int timeoutMs) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        filePickerLatch = latch;
        filePickerPaths = new ArrayList<>();

        boolean multiple = true;
        String mimeType = "*/*";
        try {
            JSONObject options = optionsJson == null || optionsJson.isEmpty() ? new JSONObject() : new JSONObject(optionsJson);
            multiple = !options.has("multiple") || options.optBoolean("multiple", true);
        } catch (Exception ignored) {
            // Keep permissive defaults.
        }

        boolean allowMultiple = multiple;
        String finalMimeType = mimeType;
        runOnUiThread(() -> {
            try {
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(finalMimeType);
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, allowMultiple);
                startActivityForResult(Intent.createChooser(intent, "选择文件"), REQ_PICK_FILES);
            } catch (Exception e) {
                Log.w(TAG, "Failed to start file picker", e);
                CountDownLatch currentLatch = filePickerLatch;
                filePickerLatch = null;
                filePickerPaths = new ArrayList<>();
                if (currentLatch != null) {
                    currentLatch.countDown();
                }
            }
        });

        boolean completed = latch.await(timeoutMs, TimeUnit.MILLISECONDS);
        if (!completed) {
            throw new IllegalStateException("File picker timed out");
        }
        return new ArrayList<>(filePickerPaths);
    }

    private String capturePhotoBlocking(int timeoutMs) throws Exception {
        if (cameraCaptureOutputFile != null) {
            throw new IllegalStateException("هناك عملية تصوير سابقة لم تنتهِ بعد.");
        }

        File cameraDir = new File(getCacheDir(), "hermes-camera");
        if (!cameraDir.isDirectory() && !cameraDir.mkdirs()) {
            throw new IllegalStateException("تعذر تجهيز مساحة الصورة المؤقتة.");
        }
        File outputFile = new File(cameraDir, "hermes-photo-" + System.currentTimeMillis() + ".jpg");
        if (!outputFile.createNewFile()) {
            throw new IllegalStateException("تعذر إنشاء ملف الصورة المؤقت.");
        }

        Uri outputUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", outputFile);
        CountDownLatch latch = new CountDownLatch(1);
        cameraCaptureLatch = latch;
        cameraCaptureOutputFile = outputFile;
        cameraCapturePath = "";
        cameraCaptureError = "";

        runOnUiThread(() -> {
            try {
                Intent cameraIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, outputUri);
                cameraIntent.setClipData(ClipData.newRawUri("Hermes photo", outputUri));
                cameraIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                startActivityForResult(cameraIntent, REQ_CAPTURE_PHOTO);
            } catch (Exception e) {
                Log.w(TAG, "Failed to open camera", e);
                cameraCaptureError = "تعذر فتح تطبيق الكاميرا. تأكد من توفر تطبيق كاميرا ثم أعد المحاولة.";
                cameraCapturePath = "";
                if (outputFile.exists() && !outputFile.delete()) {
                    Log.w(TAG, "Failed to remove empty camera output file");
                }
                cameraCaptureOutputFile = null;
                CountDownLatch pending = cameraCaptureLatch;
                cameraCaptureLatch = null;
                if (pending != null) {
                    pending.countDown();
                }
            }
        });

        if (!latch.await(timeoutMs, TimeUnit.MILLISECONDS)) {
            if (cameraCaptureLatch == latch) {
                cameraCaptureLatch = null;
            }
            cameraCapturePath = "";
            throw new IllegalStateException("انتهت مهلة التقاط الصورة.");
        }

        String error = cameraCaptureError;
        String path = cameraCapturePath;
        cameraCaptureError = "";
        cameraCapturePath = "";
        if (error != null && !error.isEmpty()) {
            throw new IllegalStateException(error);
        }
        File captured = new File(path == null ? "" : path);
        if (!captured.isFile() || captured.length() <= 0) {
            throw new IllegalStateException("لم تُحفظ صورة صالحة من الكاميرا.");
        }
        return captured.getAbsolutePath();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_RECORD_AUDIO) {
            microphoneGranted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            CountDownLatch latch = microphoneLatch;
            microphoneLatch = null;
            if (latch != null) {
                latch.countDown();
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_SPEECH_TEXT) {
            String text = "";
            if (resultCode == Activity.RESULT_OK && data != null) {
                ArrayList<String> results = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                if (results != null && !results.isEmpty()) {
                    text = results.get(0);
                }
            }
            speechText = text == null ? "" : text;
            CountDownLatch latch = speechLatch;
            speechLatch = null;
            if (latch != null) {
                latch.countDown();
            }
            return;
        }

        if (requestCode == REQ_CAPTURE_PHOTO) {
            File outputFile = cameraCaptureOutputFile;
            CountDownLatch latch = cameraCaptureLatch;
            cameraCaptureLatch = null;
            cameraCaptureOutputFile = null;
            if (resultCode == Activity.RESULT_OK && outputFile != null && outputFile.isFile() && outputFile.length() > 0 && latch != null) {
                cameraCapturePath = outputFile.getAbsolutePath();
                cameraCaptureError = "";
            } else {
                if (outputFile != null && outputFile.exists() && !outputFile.delete()) {
                    Log.w(TAG, "Failed to remove canceled camera output file");
                }
                cameraCapturePath = "";
                cameraCaptureError = resultCode == Activity.RESULT_OK
                    ? "لم تُحفظ صورة صالحة من الكاميرا."
                    : "أُلغي التقاط الصورة.";
            }
            if (latch != null) {
                latch.countDown();
            }
            return;
        }

        if (requestCode != REQ_PICK_FILES) {
            return;
        }

        ArrayList<String> paths = new ArrayList<>();
        if (resultCode == Activity.RESULT_OK && data != null) {
            ClipData clipData = data.getClipData();
            if (clipData != null) {
                for (int i = 0; i < clipData.getItemCount(); i++) {
                    String path = copyPickedUri(clipData.getItemAt(i).getUri());
                    if (path != null && !path.isEmpty()) {
                        paths.add(path);
                    }
                }
            } else if (data.getData() != null) {
                String path = copyPickedUri(data.getData());
                if (path != null && !path.isEmpty()) {
                    paths.add(path);
                }
            }
        }

        filePickerPaths = paths;
        CountDownLatch latch = filePickerLatch;
        filePickerLatch = null;
        if (latch != null) {
            latch.countDown();
        }
    }

    private String copyPickedUri(Uri uri) {
        if (uri == null) {
            return null;
        }
        try {
            ContentResolver resolver = getContentResolver();
            String name = displayNameForUri(uri);
            String safeName = System.currentTimeMillis() + "-" + sanitizeFileName(name);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                return copyPickedUriToMediaStore(resolver, uri, safeName);
            }

            File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "HermesMobileUploads");
            if (!dir.exists() && !dir.mkdirs()) {
                throw new IllegalStateException("Could not create upload directory");
            }
            File outFile = uniqueFile(dir, safeName);
            copyUriToStream(resolver, uri, new FileOutputStream(outFile));
            return outFile.getAbsolutePath();
        } catch (Exception e) {
            Log.e(TAG, "复制选择文件失败: " + e.getMessage(), e);
            return null;
        }
    }

    private String copyPickedUriToMediaStore(ContentResolver resolver, Uri source, String safeName) throws Exception {
        String mime = resolver.getType(source);
        if (mime == null || mime.trim().isEmpty()) {
            mime = URLConnection.guessContentTypeFromName(safeName);
        }
        if (mime == null || mime.trim().isEmpty()) {
            mime = "application/octet-stream";
        }

        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, safeName);
        values.put(MediaStore.MediaColumns.MIME_TYPE, mime);
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/HermesMobileUploads");
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);

        Uri outUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
        if (outUri == null) {
            throw new IllegalStateException("Could not create download entry");
        }

        copyUriToStream(resolver, source, resolver.openOutputStream(outUri));

        ContentValues published = new ContentValues();
        published.put(MediaStore.MediaColumns.IS_PENDING, 0);
        resolver.update(outUri, published, null, null);

        return new File(
            new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "HermesMobileUploads"),
            safeName
        ).getAbsolutePath();
    }

    private void copyUriToStream(ContentResolver resolver, Uri source, OutputStream rawOutput) throws Exception {
        if (rawOutput == null) {
            throw new IllegalStateException("Could not open output file");
        }
        try (InputStream input = resolver.openInputStream(source); OutputStream output = rawOutput) {
            if (input == null) {
                throw new IllegalStateException("Could not open selected file");
            }
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
        }
    }

    private String displayNameForUri(Uri uri) {
        String name = null;
        try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) {
                    name = cursor.getString(index);
                }
            }
        } catch (Exception ignored) {
            // Fall back below.
        }
        if (name == null || name.trim().isEmpty()) {
            String last = uri.getLastPathSegment();
            name = last == null || last.trim().isEmpty() ? "attachment" : last;
        }
        return name;
    }

    private static String sanitizeFileName(String name) {
        String safe = name == null ? "attachment" : name.replaceAll("[\\\\/:*?\"<>|\\r\\n]+", "_").trim();
        return safe.isEmpty() ? "attachment" : safe;
    }

    private static File uniqueFile(File dir, String name) {
        File file = new File(dir, name);
        if (!file.exists()) {
            return file;
        }
        int dot = name.lastIndexOf('.');
        String base = dot > 0 ? name.substring(0, dot) : name;
        String ext = dot > 0 ? name.substring(dot) : "";
        for (int i = 1; i < 1000; i++) {
            file = new File(dir, base + "-" + i + ext);
            if (!file.exists()) {
                return file;
            }
        }
        return new File(dir, base + "-" + System.currentTimeMillis() + ext);
    }

}
