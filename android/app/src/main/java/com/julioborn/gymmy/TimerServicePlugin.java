package com.julioborn.gymmy;

import android.content.Context;
import android.content.Intent;
import android.os.Build;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Puente JS <-> TimerForegroundService. El timer visual (timer/page.tsx) le
 * manda la linea de tiempo completa al arrancar; el servicio nativo la sigue
 * corriendo con notificacion y beeps aunque la app quede en segundo plano.
 */
@CapacitorPlugin(name = "TimerService")
public class TimerServicePlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        String stepsJson = call.getArray("steps", null) != null ? call.getArray("steps").toString() : null;
        long startAt = call.getLong("startAt", System.currentTimeMillis());

        if (stepsJson == null) {
            call.reject("Faltan los pasos del timer");
            return;
        }

        Intent intent = new Intent(getContext(), TimerForegroundService.class);
        intent.setAction(TimerForegroundService.ACTION_START);
        intent.putExtra(TimerForegroundService.EXTRA_STEPS_JSON, stepsJson);
        intent.putExtra(TimerForegroundService.EXTRA_START_AT, startAt);
        startAsForeground(intent);
        call.resolve();
    }

    @PluginMethod
    public void pause(PluginCall call) {
        Intent intent = new Intent(getContext(), TimerForegroundService.class);
        intent.setAction(TimerForegroundService.ACTION_PAUSE);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void resume(PluginCall call) {
        Intent intent = new Intent(getContext(), TimerForegroundService.class);
        intent.setAction(TimerForegroundService.ACTION_RESUME);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), TimerForegroundService.class);
        intent.setAction(TimerForegroundService.ACTION_STOP);
        getContext().startService(intent);
        call.resolve();
    }

    // Solo ACTION_START necesita promoverse a foreground service (Android exige
    // llamar startForeground() a los pocos segundos de un startForegroundService);
    // pause/resume/stop le hablan a un servicio que ya esta corriendo.
    private void startAsForeground(Intent intent) {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }
}
