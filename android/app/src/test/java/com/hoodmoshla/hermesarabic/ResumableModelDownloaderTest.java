package com.hoodmoshla.hermesarabic;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import org.junit.Test;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicReference;

public class ResumableModelDownloaderTest {
    @Test
    public void downloadsAndVerifiesPinnedContent() throws Exception {
        byte[] content = payload();
        File directory = Files.createTempDirectory("hermes-model-download").toFile();
        try (LocalHttpServer server = new LocalHttpServer(content, false)) {
            File partial = new File(directory, "model.part");
            File output = new File(directory, "model.gguf");
            ResumableModelDownloader.download(server.url(), partial, output, content.length,
                    sha256(content), null, null);
            assertArrayEquals(content, Files.readAllBytes(output.toPath()));
            assertFalse(partial.exists());
        } finally {
            deleteTree(directory);
        }
    }

    @Test
    public void resumesFromExistingPartialFile() throws Exception {
        byte[] content = payload();
        int offset = 4096;
        File directory = Files.createTempDirectory("hermes-model-resume").toFile();
        try (LocalHttpServer server = new LocalHttpServer(content, false)) {
            File partial = new File(directory, "model.part");
            File output = new File(directory, "model.gguf");
            try (FileOutputStream stream = new FileOutputStream(partial)) {
                stream.write(content, 0, offset);
            }
            ResumableModelDownloader.download(server.url(), partial, output, content.length,
                    sha256(content), null, null);
            assertTrue(server.requestHeaders().contains("range: bytes=" + offset + "-"));
            assertArrayEquals(content, Files.readAllBytes(output.toPath()));
        } finally {
            deleteTree(directory);
        }
    }

    @Test
    public void rejectsHashMismatchAndRemovesCorruptPartial() throws Exception {
        byte[] content = payload();
        File directory = Files.createTempDirectory("hermes-model-hash").toFile();
        try (LocalHttpServer server = new LocalHttpServer(content, false)) {
            File partial = new File(directory, "model.part");
            File output = new File(directory, "model.gguf");
            try {
                ResumableModelDownloader.download(server.url(), partial, output, content.length,
                        zeroHash(), null, null);
                fail("Expected a SHA-256 mismatch");
            } catch (IOException expected) {
                assertTrue(expected.getMessage().contains("SHA-256 mismatch"));
            }
            assertFalse(output.exists());
            assertFalse(partial.exists());
        } finally {
            deleteTree(directory);
        }
    }

    @Test
    public void rejectsRedirectToUntrustedCleartextHost() throws Exception {
        File directory = Files.createTempDirectory("hermes-model-redirect").toFile();
        try (LocalHttpServer server = new LocalHttpServer(payload(), true)) {
            try {
                ResumableModelDownloader.download(server.url(), new File(directory, "model.part"),
                        new File(directory, "model.gguf"), 1024, zeroHash(), null, null);
                fail("Expected non-HTTPS redirect rejection");
            } catch (IOException expected) {
                assertTrue(expected.getMessage().contains("must use HTTPS"));
            }
        } finally {
            deleteTree(directory);
        }
    }

    private static byte[] payload() {
        byte[] bytes = new byte[48 * 1024 + 37];
        for (int i = 0; i < bytes.length; i++) bytes[i] = (byte) ((i * 31 + 7) & 0xff);
        return bytes;
    }

    private static String sha256(byte[] bytes) throws Exception {
        byte[] hash = MessageDigest.getInstance("SHA-256").digest(bytes);
        StringBuilder value = new StringBuilder(64);
        for (byte part : hash) value.append(String.format(Locale.ROOT, "%02x", part & 0xff));
        return value.toString();
    }

    private static String zeroHash() {
        char[] zeros = new char[64];
        java.util.Arrays.fill(zeros, '0');
        return new String(zeros);
    }

    private static void deleteTree(File root) {
        if (root == null || !root.exists()) return;
        File[] children = root.listFiles();
        if (children != null) for (File child : children) deleteTree(child);
        root.delete();
    }

    private static final class LocalHttpServer implements AutoCloseable {
        private final ServerSocket socket;
        private final byte[] content;
        private final boolean redirect;
        private final AtomicReference<String> headers = new AtomicReference<>("");
        private final Thread worker;

        LocalHttpServer(byte[] content, boolean redirect) throws IOException {
            this.content = content;
            this.redirect = redirect;
            socket = new ServerSocket(0, 1, InetAddress.getByName("127.0.0.1"));
            worker = new Thread(this::serve, "hermes-model-test-http");
            worker.setDaemon(true);
            worker.start();
        }

        String url() {
            return "http://127.0.0.1:" + socket.getLocalPort() + "/model.gguf";
        }

        String requestHeaders() {
            return headers.get();
        }

        private void serve() {
            try (java.net.Socket client = socket.accept()) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(client.getInputStream(), StandardCharsets.US_ASCII));
                StringBuilder request = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null && !line.isEmpty()) request.append(line.toLowerCase(Locale.ROOT)).append("\n");
                headers.set(request.toString());
                OutputStream output = client.getOutputStream();
                if (redirect) {
                    writeAscii(output, "HTTP/1.1 302 Found\r\nLocation: http://example.invalid/model.gguf\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                } else {
                    String range = findRange(request.toString());
                    int start = parseRangeStart(range);
                    int length = content.length - start;
                    String status = start == 0 ? "HTTP/1.1 200 OK\r\n" : "HTTP/1.1 206 Partial Content\r\n";
                    writeAscii(output, status + "Content-Length: " + length + "\r\n" +
                            "Content-Range: bytes " + start + "-" + (content.length - 1) + "/" + content.length + "\r\n" +
                            "Accept-Ranges: bytes\r\nConnection: close\r\n\r\n");
                    output.write(content, start, length);
                }
                output.flush();
            } catch (IOException ignored) {
                // A failed assertion or rejected redirect may close the socket first.
            }
        }

        private static String findRange(String request) {
            for (String line : request.split("\\n")) if (line.startsWith("range: ")) return line.substring(7).trim();
            return "";
        }

        private static int parseRangeStart(String range) {
            if (!range.startsWith("bytes=")) return 0;
            int separator = range.indexOf('-', 6);
            return separator < 0 ? 0 : Integer.parseInt(range.substring(6, separator));
        }

        private static void writeAscii(OutputStream output, String text) throws IOException {
            output.write(text.getBytes(StandardCharsets.US_ASCII));
        }

        @Override
        public void close() throws Exception {
            socket.close();
            worker.join(1000);
        }
    }
}
