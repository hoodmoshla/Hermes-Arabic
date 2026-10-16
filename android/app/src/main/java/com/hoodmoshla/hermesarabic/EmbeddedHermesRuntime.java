package com.hoodmoshla.hermesarabic;

import android.content.Context;
import android.system.Os;
import android.util.Log;

import com.chaquo.python.PyObject;
import com.chaquo.python.Python;
import com.chaquo.python.android.AndroidPlatform;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** Process-wide synchronized Chaquopy bootstrap used by both Activity and foreground service. */
public final class EmbeddedHermesRuntime {
    private static final String TAG = "HermesRuntime";
    private static final Object LOCK = new Object();
    private static boolean nodeRuntimeReady;

    private EmbeddedHermesRuntime() {}

    public static String call(Context context, String method, Object... args) {
        Context app = context.getApplicationContext();
        synchronized (LOCK) {
            try {
                prepareNodeRuntime(app);
                if ("configure_local_model".equals(method) && args.length >= 3) {
                    Os.setenv("CUSTOM_API_KEY", String.valueOf(args[2]), true);
                } else if ("restore_local_model".equals(method)) {
                    try { Os.unsetenv("CUSTOM_API_KEY"); } catch (Exception ignored) {}
                }
                if (!Python.isStarted()) Python.start(new AndroidPlatform(app));
                PyObject module = Python.getInstance().getModule("hermes_mobile_backend");
                PyObject value = module.callAttr(method, args);
                return value == null ? "{}" : value.toString();
            } catch (Exception error) {
                Log.w(TAG, "Embedded Hermes call failed: " + method + " (details withheld)");
                return errorJson(method);
            }
        }
    }

    private static void prepareNodeRuntime(Context context) throws Exception {
        if (nodeRuntimeReady) return;
        File root = context.getFilesDir();
        File runtimeDir = new File(root, "hermes-node");
        File tuiDir = new File(root, "hermes-tui");
        File nodeBin = new File(context.getApplicationInfo().nativeLibraryDir, "libnode_exec.so");
        File marker = new File(root, ".hermes-runtime-v4-ready");
        if (!marker.isFile() || !nodeBin.isFile()
                || !new File(runtimeDir, "lib/libz.so.1").isFile()
                || !new File(tuiDir, "dist/entry.js").isFile()) {
            deleteRecursively(runtimeDir);
            deleteRecursively(tuiDir);
            copyAssetTree(context, "hermes-node", runtimeDir);
            copyAssetTree(context, "hermes-tui", tuiDir);
            if (!nodeBin.isFile()) throw new IllegalStateException("Bundled Node executable is missing");
            if (!nodeBin.setExecutable(true, true)) Log.w(TAG, "Could not mark embedded Node executable");
            try (FileOutputStream out = new FileOutputStream(marker)) {
                out.write("node=v24.17.0\ntui=prebuilt\n".getBytes(StandardCharsets.UTF_8));
                out.getFD().sync();
            }
        }
        configureRuntimeEnvironment(context, nodeBin, new File(runtimeDir, "lib"), tuiDir);
        nodeRuntimeReady = true;
    }

    private static void configureRuntimeEnvironment(Context context, File nodeBin, File nodeLibDir, File tuiDir) {
        try {
            Os.setenv("HERMES_NODE", nodeBin.getAbsolutePath(), true);
            Os.setenv("HERMES_ANDROID_NATIVE_LIB_DIR", context.getApplicationInfo().nativeLibraryDir, true);
            Os.setenv("HERMES_ANDROID_ADB_HOME", context.getFilesDir().getAbsolutePath(), true);
            Os.setenv("HERMES_TUI_DIR", tuiDir.getAbsolutePath(), true);
            Os.setenv("HERMES_SKIP_NODE_BOOTSTRAP", "1", true);
            String current = System.getenv("LD_LIBRARY_PATH");
            String libraries = nodeLibDir.getAbsolutePath();
            if (current != null && !current.isEmpty() && !current.contains(libraries)) libraries += ":" + current;
            Os.setenv("LD_LIBRARY_PATH", libraries, true);
        } catch (Exception error) {
            Log.w(TAG, "Could not configure embedded runtime environment");
        }
    }

    private static void copyAssetTree(Context context, String path, File target) throws Exception {
        String[] children = context.getAssets().list(path);
        if (children != null && children.length > 0) {
            if (!target.isDirectory() && !target.mkdirs()) throw new IllegalStateException("Cannot create runtime directory");
            for (String child : children) copyAssetTree(context, path + "/" + child, new File(target, child));
            return;
        }
        File parent = target.getParentFile();
        if (parent != null && !parent.isDirectory() && !parent.mkdirs()) throw new IllegalStateException("Cannot create runtime directory");
        try (InputStream input = context.getAssets().open(path); OutputStream output = new FileOutputStream(target)) {
            byte[] buffer = new byte[256 * 1024];
            int count;
            while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
        }
    }

    private static void deleteRecursively(File file) {
        if (!file.exists()) return;
        File[] children = file.listFiles();
        if (children != null) for (File child : children) deleteRecursively(child);
        if (!file.delete()) Log.w(TAG, "Could not replace a cached runtime file");
    }

    private static String errorJson(String method) {
        String safeMethod = method == null ? "unknown" : method.replaceAll("[^A-Za-z0-9_]", "");
        return "{\"ok\":false,\"available\":false,\"running\":false,\"error\":\"Embedded Hermes call failed: " + safeMethod + "\"}";
    }
}
