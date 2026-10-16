package com.hoodmoshla.hermesarabic;

import static org.junit.Assert.*;

import android.content.Context;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Instrumented test, which will execute on an Android device.
 *
 * @see <a href="http://d.android.com/tools/testing">Testing documentation</a>
 */
@RunWith(AndroidJUnit4.class)
public class ExampleInstrumentedTest {

    @Test
    public void useAppContext() throws Exception {
        // Context of the app under test.
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();

        assertEquals("com.hoodmoshla.hermesarabic", appContext.getPackageName());
    }

    @Test
    public void chaquopyBackendWaitsForLoopbackApiReadiness() throws Exception {
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        String filesDir = appContext.getFilesDir().getAbsolutePath();
        try {
            JSONObject started = new JSONObject(EmbeddedHermesRuntime.call(
                    appContext, "start", filesDir, 9129));
            assertTrue("Chaquopy backend did not become ready: " + started, started.optBoolean("ok"));
            assertTrue(started.optBoolean("ready"));
            assertTrue(started.optBoolean("running"));
            assertEquals(9129, started.optInt("port"));
            assertEquals("http://127.0.0.1:9129", started.optString("url"));
            assertTrue(started.optJSONObject("api_status") != null);
            assertTrue(started.getJSONObject("api_status").has("version"));

            HttpURLConnection connection = (HttpURLConnection) new URL(
                    "http://127.0.0.1:9129/api/status").openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(10000);
            try {
                assertEquals(200, connection.getResponseCode());
                try (InputStream input = connection.getInputStream();
                     ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                    byte[] buffer = new byte[4096];
                    int count;
                    while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                    assertTrue(new JSONObject(output.toString("UTF-8")).has("version"));
                }
            } finally {
                connection.disconnect();
            }

            JSONObject status = new JSONObject(EmbeddedHermesRuntime.call(
                    appContext, "status"));
            assertTrue("Status reported success before API readiness: " + status, status.optBoolean("ok"));
            assertTrue(status.optBoolean("ready"));
        } finally {
            JSONObject stopped = new JSONObject(EmbeddedHermesRuntime.call(
                    appContext, "stop", filesDir, 9129));
            assertTrue("Chaquopy backend did not stop cleanly: " + stopped, stopped.optBoolean("ok"));
        }
    }
}
