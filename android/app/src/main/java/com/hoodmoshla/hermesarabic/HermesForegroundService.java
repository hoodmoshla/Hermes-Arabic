package com.hoodmoshla.hermesarabic;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import org.json.JSONObject;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** User-visible, restartable host for Hermes Agent and the optional local model. */
public final class HermesForegroundService extends Service {
    private static final String TAG = "HermesRuntimeService";
    private static final String CHANNEL_ID = "hermes_background_agent_v1";
    private static final int NOTIFICATION_ID = 9129;
    private static final String PREFS = "hermes-background-runtime-v1";
    private static final String PREF_ENABLED = "enabled";

    public static final String ACTION_START = "com.hoodmoshla.hermesarabic.action.START_RUNTIME";
    public static final String ACTION_STOP = "com.hoodmoshla.hermesarabic.action.STOP_RUNTIME";
    public static final String ACTION_MODEL_READY = "com.hoodmoshla.hermesarabic.action.LOCAL_MODEL_READY";
    public static final String ACTION_MODEL_STOPPED = "com.hoodmoshla.hermesarabic.action.LOCAL_MODEL_STOPPED";

    private static final ExecutorService WORKER = Executors.newSingleThreadExecutor(r -> {
        Thread thread = new Thread(r, "hermes-foreground-runtime");
        thread.setDaemon(true);
        return thread;
    });

    public static void start(Context context) {
        Context app = context.getApplicationContext();
        preferences(app).edit().putBoolean(PREF_ENABLED, true).apply();
        Intent intent = new Intent(app, HermesForegroundService.class).setAction(ACTION_START);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) app.startForegroundService(intent);
        else app.startService(intent);
    }

    public static void onLocalModelReady(Context context) {
        dispatch(context, ACTION_MODEL_READY);
    }

    public static void onLocalModelStopped(Context context) {
        dispatch(context, ACTION_MODEL_STOPPED);
    }

    private static void dispatch(Context context, String action) {
        try {
            Intent intent = new Intent(context.getApplicationContext(), HermesForegroundService.class).setAction(action);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.getApplicationContext().startForegroundService(intent);
            else context.getApplicationContext().startService(intent);
        } catch (Exception error) {
            Log.w(TAG, "Could not notify the runtime service about a state change");
        }
    }

    static boolean isEnabledAfterBoot(Context context) {
        return preferences(context.getApplicationContext()).getBoolean(PREF_ENABLED, false);
    }

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startAsForeground(buildNotification("تهيئة Hermes واستعادة المهام المحلية"));
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null && !isEnabledAfterBoot(this)) {
            stopSelf(startId);
            return START_NOT_STICKY;
        }
        String action = intent == null ? ACTION_START : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            preferences(this).edit().putBoolean(PREF_ENABLED, false).apply();
            WORKER.execute(this::stopRuntime);
        } else if (ACTION_MODEL_READY.equals(action)) {
            WORKER.execute(this::configureLocalModelProvider);
        } else if (ACTION_MODEL_STOPPED.equals(action)) {
            WORKER.execute(this::restoreModelProvider);
        } else {
            preferences(this).edit().putBoolean(PREF_ENABLED, true).apply();
            startAsForeground(buildNotification("Hermes يعمل في الخلفية؛ المهام محفوظة محليًا"));
            WORKER.execute(this::startRuntime);
            LocalModelManager.resumeSelected(this);
        }
        return START_STICKY;
    }

    private void startRuntime() {
        String filesDir = getFilesDir().getAbsolutePath();
        String result = EmbeddedHermesRuntime.call(this, "start", filesDir, 9129);
        try {
            JSONObject status = new JSONObject(result);
            if (!status.optBoolean("ok", false)) {
                String error = status.optString("error", "تعذر بدء Hermes");
                updateNotification("تعذّر بدء Hermes: " + truncate(error, 90));
                Log.w(TAG, "Hermes background startup returned an error");
                return;
            }
            updateNotification("Hermes يعمل في الخلفية؛ المهام محفوظة محليًا");
        } catch (Exception error) {
            updateNotification("تعذر التحقق من حالة Hermes");
        }
    }

    private void configureLocalModelProvider() {
        try {
            JSONObject model = new JSONObject(LocalModelManager.activeProviderConfigJson());
            if (model.optString("api_key").length() < 40) {
                updateNotification("تعذّر فتح مفتاح النموذج المحلي المشفّر");
                return;
            }
            String result = EmbeddedHermesRuntime.call(this, "configure_local_model",
                    model.optString("model_id"), model.optString("base_url"), model.optString("api_key"), getFilesDir().getAbsolutePath());
            JSONObject status = new JSONObject(result);
            if (status.optBoolean("ok", false)) updateNotification("Hermes يعمل مع النموذج المحلي دون API سحابي");
            else updateNotification("النموذج يعمل؛ تعذر ربط إعداد Hermes تلقائيًا");
        } catch (Exception error) {
            Log.w(TAG, "Local model provider setup failed; secret details withheld");
            updateNotification("تعذّر ربط النموذج المحلي بـ Hermes");
        }
    }

    private void restoreModelProvider() {
        EmbeddedHermesRuntime.call(this, "restore_local_model", getFilesDir().getAbsolutePath());
        updateNotification("Hermes يعمل؛ تم فصل النموذج المحلي");
    }

    private void stopRuntime() {
        try {
            LocalModelManager.stopForService();
            EmbeddedHermesRuntime.call(this, "restore_local_model", getFilesDir().getAbsolutePath());
            EmbeddedHermesRuntime.call(this, "stop", getFilesDir().getAbsolutePath(), 9129);
        } catch (Exception error) {
            Log.w(TAG, "Hermes service stop reported an error");
        } finally {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE);
            else stopForeground(true);
            stopSelf();
        }
    }

    private void startAsForeground(Notification notification) {
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private Notification buildNotification(String text) {
        Intent open = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPending = PendingIntent.getActivity(this, 1, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Intent stop = new Intent(this, HermesForegroundService.class).setAction(ACTION_STOP);
        PendingIntent stopPending = PendingIntent.getService(this, 2, stop,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(this, CHANNEL_ID) : new Notification.Builder(this);
        builder.setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("Hermes Arabic")
                .setContentText(text)
                .setContentIntent(openPending)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setCategory(Notification.CATEGORY_SERVICE)
                .addAction(new Notification.Action.Builder(null, "إيقاف العمل بالخلفية", stopPending).build());
        return builder.build();
    }

    private void updateNotification(String text) {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) manager.notify(NOTIFICATION_ID, buildNotification(text));
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "مهام Hermes في الخلفية", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("إشعار دائم أثناء تشغيل وكيل Hermes أو نموذج الذكاء الاصطناعي محليًا");
        channel.setShowBadge(false);
        manager.createNotificationChannel(channel);
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Keep the explicitly foregrounded runtime alive when the task is swiped away.
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private static String truncate(String value, int max) {
        if (value == null) return "";
        String clean = value.replace('\n', ' ').replace('\r', ' ').trim();
        return clean.length() <= max ? clean : clean.substring(0, max) + "…";
    }
}
