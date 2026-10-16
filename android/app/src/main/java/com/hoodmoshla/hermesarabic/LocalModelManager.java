package com.hoodmoshla.hermesarabic;

import android.app.ActivityManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import net.ladenthin.llama.LlamaModel;
import net.ladenthin.llama.parameters.ModelParameters;
import net.ladenthin.llama.server.OpenAiCompatServer;
import net.ladenthin.llama.server.OpenAiServerConfig;

import org.json.JSONObject;

import java.io.File;
import java.security.SecureRandom;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/** Owns the pinned GGUF download, native llama.cpp model and loopback inference API. */
public final class LocalModelManager {
    private static final String TAG = "HermesLocalModel";
    public static final String MODEL_ID = "qwen2.5-0.5b-instruct-q4_k_m";
    public static final String MODEL_NAME = "Qwen2.5 0.5B Instruct (Q4_K_M)";
    public static final String MODEL_FILE = "Qwen2.5-0.5B-Instruct-Q4_K_M.gguf";
    public static final long MODEL_SIZE = 397_808_192L;
    public static final String MODEL_SHA256 = "6eb923e7d26e9cea28811e1a8e852009b21242fb157b26149d3b188f3a8c8653";
    public static final String MODEL_REPOSITORY = "bartowski/Qwen2.5-0.5B-Instruct-GGUF";
    public static final String MODEL_REVISION = "41ba88dbac95fed2528c92514c131d73eb5a174b";
    public static final String MODEL_LICENSE = "Apache-2.0";
    public static final int SERVER_PORT = 9130;

    private static final String PREFS = "hermes-local-model-v1";
    private static final String PREF_SELECTED = "selected_model";
    private static final String PREF_DOWNLOAD_STATE = "download_state";
    private static final String API_KEY_ALIAS = "hermes_local_llm_api_key_v1";
    private static final String API_KEY_PREF = "local_llm_api_key";
    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor(r -> {
        Thread thread = new Thread(r, "hermes-local-llama");
        thread.setDaemon(true);
        return thread;
    });
    private static final AtomicBoolean DOWNLOADING = new AtomicBoolean(false);
    private static volatile Context appContext;
    private static final AtomicBoolean CANCEL_REQUESTED = new AtomicBoolean(false);
    private static volatile String runtimeState = "idle";
    private static volatile String runtimeError = "";
    private static volatile long downloadedBytes;
    private static volatile LlamaModel llamaModel;
    private static volatile OpenAiCompatServer httpServer;
    private static volatile HttpURLConnectionHolder activeDownload;

    private LocalModelManager() {}

    public static synchronized void initialize(Context context) {
        if (context != null) appContext = context.getApplicationContext();
    }

    private static Context context() {
        Context context = appContext;
        if (context == null) throw new IllegalStateException("Local model manager is not initialized");
        return context;
    }

    public static String statusJson() {
        try {
            Context context = context();
            File model = modelFile(context);
            File part = partialFile(context);
            if (downloadedBytes == 0 && part.isFile()) downloadedBytes = Math.min(part.length(), MODEL_SIZE);
            String downloadState = DOWNLOADING.get() ? "downloading"
                    : model.isFile() && model.length() == MODEL_SIZE ? "downloaded"
                    : part.isFile() && part.length() > 0 ? "interrupted"
                    : "not_downloaded";
            JSONObject data = new JSONObject();
            data.put("ok", true);
            data.put("model_id", MODEL_ID);
            data.put("model_name", MODEL_NAME);
            data.put("license", MODEL_LICENSE);
            data.put("size_bytes", MODEL_SIZE);
            data.put("downloaded_bytes", downloadedBytes);
            data.put("progress", (int) Math.min(100, (downloadedBytes * 100L) / MODEL_SIZE));
            data.put("download_state", downloadState);
            data.put("runtime_state", runtimeState);
            data.put("runtime_error", runtimeError);
            data.put("selected", MODEL_ID.equals(prefs(context).getString(PREF_SELECTED, "")));
            data.put("running", httpServer != null && llamaModel != null);
            data.put("endpoint", "http://127.0.0.1:" + SERVER_PORT + "/v1");
            return data.toString();
        } catch (Exception e) {
            return errorJson(e);
        }
    }

    public static String download(String modelId) {
        if (!MODEL_ID.equals(modelId)) return errorJson("Unknown model id");
        if (!DOWNLOADING.compareAndSet(false, true)) return statusJson();
        initializeIfNeeded();
        CANCEL_REQUESTED.set(false);
        runtimeState = "idle";
        runtimeError = "";
        downloadedBytes = partialFile(context()).isFile() ? partialFile(context()).length() : 0L;
        prefs(context()).edit().putString(PREF_DOWNLOAD_STATE, "downloading").apply();
        EXECUTOR.execute(() -> {
            try {
                File target = modelFile(context());
                File partial = partialFile(context());
                String url = "https://huggingface.co/" + MODEL_REPOSITORY + "/resolve/" + MODEL_REVISION + "/" + MODEL_FILE + "?download=true";
                ResumableModelDownloader.download(url, partial, target, MODEL_SIZE, MODEL_SHA256,
                        (received, total) -> downloadedBytes = received,
                        CANCEL_REQUESTED::get);
                downloadedBytes = MODEL_SIZE;
                prefs(context()).edit().putString(PREF_DOWNLOAD_STATE, "downloaded").apply();
                runtimeError = "";
            } catch (Exception e) {
                runtimeError = safeMessage(e);
                prefs(context()).edit().putString(PREF_DOWNLOAD_STATE, "interrupted").apply();
                Log.w(TAG, "Pinned model download failed: " + runtimeError);
            } finally {
                activeDownload = null;
                DOWNLOADING.set(false);
            }
        });
        return statusJson();
    }

    public static String start(String modelId) {
        if (!MODEL_ID.equals(modelId)) return errorJson("Unknown model id");
        initializeIfNeeded();
        File modelFile = modelFile(context());
        if (!modelFile.isFile() || modelFile.length() != MODEL_SIZE) {
            return errorJson("Download the verified GGUF model before starting the local engine");
        }
        if (httpServer != null && llamaModel != null) return statusJson();
        if ("loading".equals(runtimeState)) return statusJson();
        runtimeState = "loading";
        runtimeError = "";
        prefs(context()).edit().putString(PREF_SELECTED, MODEL_ID).apply();
        EXECUTOR.execute(() -> loadAndStart(modelFile));
        return statusJson();
    }

    /** Re-load the user's previously selected model after Android recreates the process/service. */
    public static void resumeSelected(Context context) {
        initialize(context);
        if (!MODEL_ID.equals(prefs(context()).getString(PREF_SELECTED, ""))) return;
        File model = modelFile(context());
        if (model.isFile() && model.length() == MODEL_SIZE && httpServer == null && !"loading".equals(runtimeState)) {
            runtimeState = "loading";
            EXECUTOR.execute(() -> loadAndStart(model));
        }
    }

    public static String stop() {
        initializeIfNeeded();
        prefs(context()).edit().remove(PREF_SELECTED).apply();
        EXECUTOR.execute(() -> closeRuntime(true));
        return statusJson();
    }

    /** Quiesce native work synchronously before the user explicitly stops the foreground service. */
    static void stopForService() {
        initializeIfNeeded();
        prefs(context()).edit().remove(PREF_SELECTED).apply();
        CANCEL_REQUESTED.set(true);
        try {
            Future<?> close = EXECUTOR.submit(() -> closeRuntime(false));
            close.get(55, TimeUnit.SECONDS);
        } catch (Exception e) {
            Log.w(TAG, "Timed out while stopping the local model runtime");
        }
    }

    public static String deleteModel(String modelId) {
        if (!MODEL_ID.equals(modelId)) return errorJson("Unknown model id");
        initializeIfNeeded();
        if (DOWNLOADING.get()) return errorJson("Cancel or finish the download before deleting the model");
        if (httpServer != null || llamaModel != null || "loading".equals(runtimeState)) {
            prefs(context()).edit().remove(PREF_SELECTED).apply();
            EXECUTOR.execute(() -> closeRuntime(true));
        }
        EXECUTOR.execute(() -> {
            File file = modelFile(context());
            File part = partialFile(context());
            if (file.exists() && !file.delete()) runtimeError = "Could not delete the private model file";
            if (part.exists() && !part.delete()) runtimeError = "Could not delete the incomplete model file";
            downloadedBytes = 0L;
            prefs(context()).edit().putString(PREF_DOWNLOAD_STATE, "not_downloaded").apply();
        });
        return statusJson();
    }

    public static String activeProviderConfigJson() {
        try {
            if (httpServer == null || llamaModel == null) return "{}";
            Context context = context();
            String key = AndroidSecretStore.get(context, API_KEY_ALIAS, API_KEY_PREF);
            JSONObject data = new JSONObject();
            data.put("model_id", MODEL_ID);
            data.put("model_name", MODEL_NAME);
            data.put("base_url", "http://127.0.0.1:" + SERVER_PORT + "/v1");
            data.put("api_key", key);
            return data.toString();
        } catch (Exception e) {
            return "{}";
        }
    }

    public static String cancelDownload() {
        CANCEL_REQUESTED.set(true);
        return statusJson();
    }

    private static void initializeIfNeeded() {
        if (appContext == null) throw new IllegalStateException("Local model manager is not initialized");
    }

    private static void loadAndStart(File file) {
        LlamaModel model = null;
        OpenAiCompatServer server = null;
        try {
            if (!file.isFile() || file.length() != MODEL_SIZE
                    || !MODEL_SHA256.equalsIgnoreCase(ResumableModelDownloader.sha256(file))) {
                throw new IllegalStateException("ملف النموذج المحلي لا يطابق بصمة SHA-256 الموثقة؛ أعد تنزيله للتحقق.");
            }
            long available = Runtime.getRuntime().maxMemory();
            ActivityManager manager = (ActivityManager) context().getSystemService(Context.ACTIVITY_SERVICE);
            if (manager != null) {
                ActivityManager.MemoryInfo info = new ActivityManager.MemoryInfo();
                manager.getMemoryInfo(info);
                available = info.availMem;
            }
            if (available < 650L * 1024L * 1024L) {
                throw new IllegalStateException("لا تتوفر ذاكرة كافية الآن؛ يلزم نحو 650 MiB على الأقل لتشغيل هذا النموذج بأمان.");
            }
            int threads = Math.max(1, Math.min(4, Runtime.getRuntime().availableProcessors() - 1));
            ModelParameters parameters = new ModelParameters()
                    .setModel(file.getAbsolutePath())
                    .setThreads(threads)
                    .setCtxSize(2048)
                    .setPredict(256)
                    .setGpuLayers(0);
            model = new LlamaModel(parameters);
            String apiKey = ensureApiKey();
            OpenAiServerConfig config = OpenAiServerConfig.builder()
                    .host("127.0.0.1")
                    .port(SERVER_PORT)
                    .apiKey(apiKey)
                    .modelId(MODEL_ID)
                    .maxInputTokens(2048)
                    .maxOutputTokens(256)
                    .corsAllowOrigin("https://localhost")
                    .build();
            server = new OpenAiCompatServer(model, config).start();
            llamaModel = model;
            httpServer = server;
            runtimeState = "running";
            runtimeError = "";
            HermesForegroundService.onLocalModelReady(context());
        } catch (Exception e) {
            if (server != null) try { server.close(); } catch (Exception ignored) {}
            if (model != null) try { model.close(); } catch (Exception ignored) {}
            runtimeState = "error";
            runtimeError = safeMessage(e);
            Log.e(TAG, "Local llama.cpp engine failed to start", e);
        }
    }

    private static void closeRuntime(boolean restoreHermesConfig) {
        OpenAiCompatServer server = httpServer;
        LlamaModel model = llamaModel;
        httpServer = null;
        llamaModel = null;
        if (server != null) try { server.close(); } catch (Exception e) { Log.w(TAG, "Could not stop local model endpoint", e); }
        if (model != null) try { model.close(); } catch (Exception e) { Log.w(TAG, "Could not release native model", e); }
        runtimeState = "idle";
        if (restoreHermesConfig) HermesForegroundService.onLocalModelStopped(context());
    }

    private static String ensureApiKey() throws Exception {
        String key = AndroidSecretStore.get(context(), API_KEY_ALIAS, API_KEY_PREF);
        if (key.length() >= 40) return key;
        byte[] random = new byte[32];
        new SecureRandom().nextBytes(random);
        StringBuilder encoded = new StringBuilder(64);
        for (byte b : random) encoded.append(String.format(Locale.ROOT, "%02x", b & 0xff));
        key = encoded.toString();
        AndroidSecretStore.put(context(), API_KEY_ALIAS, API_KEY_PREF, key);
        return key;
    }

    private static File modelDirectory(Context context) {
        File dir = new File(context.getNoBackupFilesDir(), "hermes/models");
        if (!dir.isDirectory() && !dir.mkdirs()) throw new IllegalStateException("Cannot create private model directory");
        return dir;
    }

    private static File modelFile(Context context) { return new File(modelDirectory(context), MODEL_FILE); }
    private static File partialFile(Context context) { return new File(modelDirectory(context), MODEL_FILE + ".part"); }
    private static SharedPreferences prefs(Context context) { return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    private static String errorJson(String message) {
        try { return new JSONObject().put("ok", false).put("error", message == null ? "Unknown error" : message).toString(); }
        catch (Exception ignored) { return "{\"ok\":false,\"error\":\"Unknown error\"}"; }
    }
    private static String errorJson(Exception error) { return errorJson(safeMessage(error)); }
    private static String safeMessage(Throwable error) {
        String message = error == null ? "Unknown error" : error.getMessage();
        return message == null || message.trim().isEmpty() ? error.getClass().getSimpleName() : message;
    }

    private static final class HttpURLConnectionHolder {
        final AtomicBoolean cancelled = new AtomicBoolean(false);
    }
}
