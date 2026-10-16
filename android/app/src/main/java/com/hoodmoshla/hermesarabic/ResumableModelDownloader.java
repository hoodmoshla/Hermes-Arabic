package com.hoodmoshla.hermesarabic;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;

/** Verified, resumable HTTPS download for pinned model artifacts. */
final class ResumableModelDownloader {
    interface ProgressListener {
        void onProgress(long downloadedBytes, long totalBytes);
    }

    interface CancellationCheck {
        boolean isCancelled();
    }

    private static final int CONNECT_TIMEOUT_MS = 20_000;
    private static final int READ_TIMEOUT_MS = 45_000;
    private static final int MAX_REDIRECTS = 8;

    private ResumableModelDownloader() {}

    static void download(String sourceUrl, File partialFile, File outputFile,
                         long expectedSize, String expectedSha256,
                         ProgressListener progress, CancellationCheck cancellation)
            throws IOException {
        if (expectedSize <= 0 || expectedSha256 == null || expectedSha256.length() != 64) {
            throw new IllegalArgumentException("Invalid pinned model metadata");
        }
        File parent = partialFile.getParentFile();
        if (parent == null || (!parent.isDirectory() && !parent.mkdirs())) {
            throw new IOException("Cannot create private model directory");
        }
        long existing = partialFile.isFile() ? partialFile.length() : 0L;
        if (existing > expectedSize) {
            if (!partialFile.delete()) throw new IOException("Invalid partial download cannot be removed");
            existing = 0L;
        }

        HttpURLConnection connection = open(sourceUrl, existing);
        try {
            int response = connection.getResponseCode();
            if (existing > 0 && response == HttpURLConnection.HTTP_OK) {
                // The server ignored Range. Start cleanly rather than appending a full response.
                existing = 0L;
            } else if (existing > 0 && response != HttpURLConnection.HTTP_PARTIAL) {
                throw new IOException("Resume request rejected with HTTP " + response);
            } else if (existing == 0 && response != HttpURLConnection.HTTP_OK) {
                throw new IOException("Model download failed with HTTP " + response);
            }

            if (response == HttpURLConnection.HTTP_PARTIAL) {
                String range = connection.getHeaderField("Content-Range");
                if (range == null || !range.startsWith("bytes " + existing + "-")) {
                    throw new IOException("Invalid Content-Range for resumed model download");
                }
            }
            long responseLength = connection.getContentLengthLong();
            long total = response == HttpURLConnection.HTTP_PARTIAL
                    ? expectedSize : (responseLength > 0 ? responseLength : expectedSize);
            if (total != expectedSize) {
                throw new IOException("Unexpected model size: " + total + " bytes");
            }

            try (InputStream input = connection.getInputStream();
                 FileOutputStream output = new FileOutputStream(partialFile, response == HttpURLConnection.HTTP_PARTIAL)) {
                byte[] buffer = new byte[256 * 1024];
                long count = existing;
                int read;
                while ((read = input.read(buffer)) != -1) {
                    if (cancellation != null && cancellation.isCancelled()) {
                        throw new IOException("Model download cancelled");
                    }
                    count += read;
                    if (count > expectedSize) throw new IOException("Model download exceeded pinned size");
                    output.write(buffer, 0, read);
                    if (progress != null) progress.onProgress(count, expectedSize);
                }
                output.getFD().sync();
            }
        } finally {
            connection.disconnect();
        }

        if (!partialFile.isFile() || partialFile.length() != expectedSize) {
            throw new IOException("Incomplete model download: " + (partialFile.exists() ? partialFile.length() : 0) + " bytes");
        }
        String actualHash = sha256(partialFile);
        if (!expectedSha256.equalsIgnoreCase(actualHash)) {
            if (!partialFile.delete()) partialFile.deleteOnExit();
            throw new IOException("Model integrity check failed (SHA-256 mismatch)");
        }
        if (outputFile.exists() && !outputFile.delete()) {
            throw new IOException("Cannot replace previous model file");
        }
        if (!partialFile.renameTo(outputFile)) {
            throw new IOException("Cannot finalize verified model file");
        }
    }

    static String sha256(File file) throws IOException {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (InputStream input = new FileInputStream(file)) {
                byte[] buffer = new byte[256 * 1024];
                int read;
                while ((read = input.read(buffer)) != -1) digest.update(buffer, 0, read);
            }
            StringBuilder result = new StringBuilder(64);
            for (byte value : digest.digest()) result.append(String.format(Locale.ROOT, "%02x", value & 0xff));
            return result.toString();
        } catch (java.security.NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }

    private static HttpURLConnection open(String sourceUrl, long rangeStart) throws IOException {
        URL current = new URL(sourceUrl);
        for (int redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
            if (!"https".equalsIgnoreCase(current.getProtocol()) && !isLoopbackTestHttp(current)) {
                throw new IOException("Model source must use HTTPS");
            }
            HttpURLConnection connection = (HttpURLConnection) current.openConnection();
            connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
            connection.setReadTimeout(READ_TIMEOUT_MS);
            connection.setInstanceFollowRedirects(false);
            connection.setRequestProperty("User-Agent", "Hermes-Arabic/0.2 (on-device GGUF downloader)");
            connection.setRequestProperty("Accept-Encoding", "identity");
            if (rangeStart > 0) connection.setRequestProperty("Range", "bytes=" + rangeStart + "-");
            int status = connection.getResponseCode();
            if (status >= 300 && status < 400) {
                String location = connection.getHeaderField("Location");
                connection.disconnect();
                if (location == null || redirect == MAX_REDIRECTS) throw new IOException("Invalid model download redirect");
                current = new URL(current, location);
                continue;
            }
            return connection;
        }
        throw new IOException("Too many model download redirects");
    }

    // Local HTTP is exposed only to deterministic JVM unit tests; production callers use a pinned HTTPS URL.
    private static boolean isLoopbackTestHttp(URL url) {
        if (!"http".equalsIgnoreCase(url.getProtocol())) return false;
        String host = url.getHost();
        return "127.0.0.1".equals(host) || "localhost".equalsIgnoreCase(host);
    }
}
