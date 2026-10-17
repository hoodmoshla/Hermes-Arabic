package com.hoodmoshla.hermesarabic;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Intentionally inert: Hermes must only start after the user opens the app. */
public final class HermesBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        // No background/boot autostart. The app's explicit Activity lifecycle owns runtime startup.
    }
}
