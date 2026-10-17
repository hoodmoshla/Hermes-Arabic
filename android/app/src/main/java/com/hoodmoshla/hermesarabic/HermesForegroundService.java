package com.hoodmoshla.hermesarabic;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;

import org.json.JSONObject;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/** User-visible, restartable host for Hermes Agent and the optional local model. */
public final class HermesForegroundService extends Service {
    private static final String TAG = "HermesRuntimeService";
    private static final String CHANNEL_ID = "hermes_background_agent_v1";
    private static final int NOTIFICATION_ID = 9129;
    private static final long WATCHDOG_INTERVAL_MS = 4_000L;
    private static final long BACKGROUND_GRACE_MS = 8_000L;
    private static final int REQUIRED_IDLE_SAMPLES = 2;
    private static final Object LIFECYCLE_LOCK = new Object();
    private static volatile boolean activityInForeground;
    private static volatile long backgroundSinceElapsed;
    private static volatile long lifecycleGeneration;

    public static final String ACTION_START = "com.hoodmoshla.hermesarabic.action.START_RUNTIME";
    public static final String ACTION_STOP = "com.hoodmoshla.hermesarabic.action.STOP_RUNTIME";
    public static final String ACTION_MODEL_READY = "com.hoodmoshla.hermesarabic.action.LOCAL_MODEL_READY";
    public static final String ACTION_MODEL_STOPPED = "com.hoodmoshla.hermesarabic.action.LOCAL_MODEL_STOPPED";

    private static final ExecutorService WORKER = Executors.newSingleThreadExecutor(r -> {
        Thread thread = new Thread(r, "hermes-foreground-runtime");
        thread.setDaemon(true);
        return thread;
    });
    private final Handler watchdogHandler = new Handler(Looper.getMainLooper());
    private final AtomicBoolean watchdogCheckRunning = new AtomicBoolean(false);
    private final Runnable watchdog = this::checkIdleRuntime;
    private int consecutiveIdleSamples;

    public static void start(Context context) {
        Context app = context.getApplicationContext();
        Intent intent = new Intent(app, HermesForegroundService.class).setAction(ACTION_START);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) app.startForegroundService(intent);
        else app.startService(intent);
    }

    /** Updated by MainActivity lifecycle callbacks; false means app task is backgrounded. */
    public static void setActivityInForeground(boolean foreground) {
        synchronized (LIFECYCLE_LOCK) {
            if (activityInForeground != foreground) lifecycleGeneration++;
            activityInForeground = foreground;
            backgroundSinceElapsed = foreground ? 0L : SystemClock.elapsedRealtime();
        }
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

    @Override
    public void onCreate() {
        super.onCreate();
        synchronized (LIFECYCLE_LOCK) {
            if (!activityInForeground && backgroundSinceElapsed == 0L) backgroundSinceElapsed = SystemClock.elapsedRealtime();
        }
        createNotificationChannel();
        startAsForeground(buildNotification("تهيئة Hermes واستعادة المهام المحلية"));
        watchdogHandler.postDelayed(watchdog, WATCHDOG_INTERVAL_MS);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf(startId);
            return START_NOT_STICKY;
        }
        String action = intent == null ? ACTION_START : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            WORKER.execute(this::stopRuntime);
        } else if (ACTION_MODEL_READY.equals(action)) {
            WORKER.execute(this::configureLocalModelProvider);
        } else if (ACTION_MODEL_STOPPED.equals(action)) {
            WORKER.execute(this::restoreModelProvider);
        } else {
            startAsForeground(buildNotification("Hermes يعمل في الخلفية؛ المهام محفوظة محليًا"));
            WORKER.execute(this::startRuntime);
            LocalModelManager.resumeSelected(this);
        }
        return START_NOT_STICKY;
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

    /** Native watchdog: it never depends on WebView/JavaScript being alive. */
    private void checkIdleRuntime() {
        watchdogHandler.postDelayed(watchdog, WATCHDOG_INTERVAL_MS);
        if (!watchdogCheckRunning.compareAndSet(false, true)) return;
        WORKER.execute(() -> {
            try {
                evaluateIdleRuntime();
            } catch (Exception error) {
                consecutiveIdleSamples = 0;
                updateNotification("تعذّر التحقق من المهام؛ أبقينا Hermes يعمل بأمان");
                Log.w(TAG, "Idle watchdog failed closed", error);
            } finally {
                watchdogCheckRunning.set(false);
            }
        });
    }

    private void evaluateIdleRuntime() {
        final long observedGeneration;
        final long backgroundSince;
        synchronized (LIFECYCLE_LOCK) {
            observedGeneration = lifecycleGeneration;
            if (activityInForeground) {
                consecutiveIdleSamples = 0;
                return;
            }
            if (backgroundSinceElapsed == 0L) backgroundSinceElapsed = SystemClock.elapsedRealtime();
            backgroundSince = backgroundSinceElapsed;
        }
        if (SystemClock.elapsedRealtime() - backgroundSince < BACKGROUND_GRACE_MS || LocalModelManager.hasOngoingSetupWork()) {
            consecutiveIdleSamples = 0;
            return;
        }

        JSONObject status;
        try {
            status = new JSONObject(EmbeddedHermesRuntime.call(this, "status"));
        } catch (Exception error) {
            consecutiveIdleSamples = 0;
            updateNotification("حالة المهام غير معروفة؛ لن نوقف Hermes حتى يمكن التحقق منها");
            return;
        }
        if (!status.optBoolean("task_state_available", false)
                || !status.has("active_tasks") || status.isNull("active_tasks")) {
            consecutiveIdleSamples = 0;
            String detail = status.optString("task_state_error", status.optString("error", "حالة المهام غير متاحة"));
            updateNotification("تعذّر التحقق من المهام؛ Hermes مستمر بأمان: " + truncate(detail, 62));
            return;
        }
        final int activeTasks;
        try {
            activeTasks = status.getInt("active_tasks");
        } catch (Exception error) {
            consecutiveIdleSamples = 0;
            updateNotification("عدد المهام غير صالح؛ لن نوقف Hermes حتى يمكن التحقق منه");
            return;
        }
        if (activeTasks < 0) {
            consecutiveIdleSamples = 0;
            updateNotification("عدد المهام غير صالح؛ لن نوقف Hermes حتى يمكن التحقق منه");
            return;
        }
        if (activeTasks > 0) {
            consecutiveIdleSamples = 0;
            updateNotification("تستمر مهام Hermes في الخلفية (" + activeTasks + ")");
            return;
        }
        if (++consecutiveIdleSamples < REQUIRED_IDLE_SAMPLES) return;
        if (LocalModelManager.hasOngoingSetupWork() || !stillSameBackground(observedGeneration)) {
            consecutiveIdleSamples = 0;
            return;
        }
        // Release native model resources but keep the persisted user selection for the next app launch.
        LocalModelManager.pauseForIdleService();
        if (LocalModelManager.hasOngoingSetupWork() || !stillSameBackground(observedGeneration)) {
            consecutiveIdleSamples = 0;
            return;
        }
        EmbeddedHermesRuntime.call(this, "restore_local_model", getFilesDir().getAbsolutePath());
        String stopped = EmbeddedHermesRuntime.call(this, "stop", getFilesDir().getAbsolutePath(), 9129);
        try {
            JSONObject stopStatus = new JSONObject(stopped);
            if (!stopStatus.optBoolean("ok", false)) {
                consecutiveIdleSamples = 0;
                updateNotification("تعذّر إيقاف Hermes تلقائيًا؛ الخدمة باقية: " + truncate(stopStatus.optString("error", "خطأ غير معروف"), 64));
                return;
            }
        } catch (Exception error) {
            consecutiveIdleSamples = 0;
            updateNotification("لم نتمكن من تأكيد الإيقاف؛ أبقينا الخدمة نشطة");
            return;
        }
        if (!stillSameBackground(observedGeneration)) {
            // The user returned during shutdown: restore the runtime rather than leaving the app offline.
            consecutiveIdleSamples = 0;
            startRuntime();
            LocalModelManager.resumeSelected(this);
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE);
        else stopForeground(true);
        stopSelf();
    }

    private boolean stillSameBackground(long generation) {
        synchronized (LIFECYCLE_LOCK) {
            return !activityInForeground && lifecycleGeneration == generation
                    && backgroundSinceElapsed != 0L
                    && SystemClock.elapsedRealtime() - backgroundSinceElapsed >= BACKGROUND_GRACE_MS;
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
        watchdogHandler.removeCallbacks(watchdog);
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
