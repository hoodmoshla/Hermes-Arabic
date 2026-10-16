package com.hoodmoshla.hermesarabic;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

/** Restarts the user-enabled runtime after a device reboot; never enables it before first use. */
public final class HermesBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) return;
        if (!HermesForegroundService.isEnabledAfterBoot(context)) return;
        try {
            Intent start = new Intent(context, HermesForegroundService.class).setAction(HermesForegroundService.ACTION_START);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(start);
            else context.startService(start);
        } catch (Exception error) {
            Log.w("HermesBoot", "Could not restore the previously enabled runtime");
        }
    }
}
