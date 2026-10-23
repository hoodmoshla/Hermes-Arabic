package com.hoodmoshla.hermesarabic;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import androidx.core.content.FileProvider;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;

/** Checks Hermes Arabic Android releases only; upstream Hermes tags are not installable APKs. */
public final class AppUpdateManager {
    public static final String RELEASES_URL =
        "https://api.github.com/repos/hoodmoshla/Hermes-Arabic/releases/latest";
    private static final String ASSET_PREFIX = "hermes-arabic-arm64-v";
    private static volatile JSONObject lastStatus;

    private AppUpdateManager() {}

    public static JSONObject check(Context context) {
        JSONObject status = baseStatus(context);
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(RELEASES_URL).openConnection();
            connection.setConnectTimeout(12000);
            connection.setReadTimeout(12000);
            connection.setInstanceFollowRedirects(false);
            connection.setRequestProperty("Accept", "application/vnd.github+json");
            connection.setRequestProperty("User-Agent", "HermesArabic-Android");
            int code = connection.getResponseCode();
            if (code != HttpURLConnection.HTTP_OK) {
                status.put("status", "network_error");
                status.put("error", "http_" + code);
                return remember(status);
            }
            JSONObject release = new JSONObject(read(connection.getInputStream()));
            JSONObject asset = findApk(release.optJSONArray("assets"));
            status.put("latest_tag", release.optString("tag_name"));
            status.put("notes", release.optString("body"));
            if (asset == null) {
                status.put("status", "no_compatible_asset");
                status.put("error", "android_apk_missing");
                return remember(status);
            }
            int remoteCode = parseVersionCode(release, asset);
            status.put("latest_version_code", remoteCode);
            status.put("size", asset.optLong("size"));
            status.put("download_url", asset.optString("browser_download_url"));
            status.put("expected_sha256", shaFromDigest(asset.optString("digest")));
            if (remoteCode <= 0) {
                status.put("status", "version_code_unavailable");
                status.put("error", "android_version_code_missing");
                return remember(status);
            }
            if (remoteCode <= status.optInt("installed_version_code")) {
                status.put("status", "up_to_date");
                status.put("notify", false);
                return remember(status);
            }
            status.put("status", "update_available");
            status.put("notify", true);
            return remember(status);
        } catch (Exception error) {
            try {
                status.put("status", "network_error");
                status.put("error", error.getClass().getSimpleName());
            } catch (Exception ignored) {
                return status;
            }
            return remember(status);
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    public static JSONObject cachedOrCheck(Context context) {
        JSONObject cached = lastStatus;
        if (cached != null) return cached;
        return check(context);
    }

    public static JSONObject downloadVerified(Context context, String url, String expectedSha256) {
        JSONObject result = new JSONObject();
        HttpURLConnection connection = null;
        try {
            if (url == null || !url.startsWith("https://github.com/hoodmoshla/Hermes-Arabic/releases/download/")) {
                result.put("ok", false);
                result.put("error", "release_url_changed");
                return result;
            }
            connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(30000);
            int code = connection.getResponseCode();
            if (code != HttpURLConnection.HTTP_OK) {
                result.put("ok", false);
                result.put("error", "http_" + code);
                return result;
            }
            byte[] bytes = readBytes(connection.getInputStream());
            String actual = sha256(bytes);
            if (expectedSha256 == null || expectedSha256.isEmpty() || !actual.equalsIgnoreCase(expectedSha256)) {
                result.put("ok", false);
                result.put("error", "sha256_mismatch");
                result.put("actual_sha256", actual);
                return result;
            }
            File target = new File(context.getCacheDir(), "hermes-arabic-update.apk");
            try (FileOutputStream out = new FileOutputStream(target)) {
                out.write(bytes);
            }
            result.put("ok", true);
            result.put("sha256", actual);
            result.put("path", target.getAbsolutePath());
            result.put("install_mode", "android_package_installer_confirmation");
            result.put("preserves_private_data", true);
            return result;
        } catch (Exception error) {
            try {
                result.put("ok", false);
                result.put("error", error.getClass().getSimpleName());
            } catch (Exception ignored) {
                return result;
            }
            return result;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    public static boolean openInstaller(Context context, File apk) {
        try {
            Uri uri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", apk);
            Intent intent = new Intent(Intent.ACTION_VIEW)
                .setDataAndType(uri, "application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            return true;
        } catch (Exception error) {
            return false;
        }
    }

    private static JSONObject baseStatus(Context context) {
        JSONObject status = new JSONObject();
        try {
            PackageInfo info = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            long code = Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
            status.put("ok", true);
            status.put("package", context.getPackageName());
            status.put("installed_version_code", code);
            status.put("installed_version_name", info.versionName);
            status.put("notify", false);
            status.put("source", "hoodmoshla/Hermes-Arabic");
        } catch (Exception error) {
            try { status.put("ok", false); } catch (Exception ignored) {}
        }
        return status;
    }

    private static JSONObject findApk(JSONArray assets) {
        if (assets == null) return null;
        for (int i = 0; i < assets.length(); i++) {
            JSONObject asset = assets.optJSONObject(i);
            String name = asset == null ? "" : asset.optString("name");
            if (name.startsWith(ASSET_PREFIX) && name.endsWith(".apk")) return asset;
        }
        return null;
    }

    private static int parseVersionCode(JSONObject release, JSONObject asset) {
        int direct = release.optInt("android_version_code", 0);
        if (direct > 0) return direct;
        String body = release.optString("body");
        int marker = body.indexOf("versionCode:");
        if (marker < 0) return 0;
        String tail = body.substring(marker + "versionCode:".length()).trim();
        StringBuilder digits = new StringBuilder();
        for (int i = 0; i < tail.length() && Character.isDigit(tail.charAt(i)); i++) digits.append(tail.charAt(i));
        return digits.length() == 0 ? 0 : Integer.parseInt(digits.toString());
    }

    private static String shaFromDigest(String digest) {
        if (digest == null) return "";
        String value = digest.toLowerCase(Locale.ROOT);
        return value.startsWith("sha256:") ? value.substring(7) : "";
    }

    private static JSONObject remember(JSONObject status) {
        lastStatus = status;
        return status;
    }

    private static String read(InputStream input) throws Exception {
        return new String(readBytes(input), java.nio.charset.StandardCharsets.UTF_8);
    }

    private static byte[] readBytes(InputStream input) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int read;
        while ((read = input.read(buffer)) >= 0) out.write(buffer, 0, read);
        return out.toByteArray();
    }

    private static String sha256(byte[] bytes) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(bytes);
        StringBuilder text = new StringBuilder(digest.length * 2);
        for (byte value : digest) text.append(String.format(Locale.ROOT, "%02x", value));
        return text.toString();
    }
}
