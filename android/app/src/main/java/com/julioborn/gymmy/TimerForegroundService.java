package com.julioborn.gymmy;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Corre el timer intermitente en segundo plano con una notificacion persistente
 * y beeps, para que siga funcionando aunque se apague la pantalla o se cambie
 * de app. La pantalla-principal (JS) le manda la linea de tiempo completa
 * (fases + duracion + ronda) calculada igual que en el timer visual, y este
 * servicio la recorre por su cuenta usando timestamps absolutos (igual que el
 * tick del lado web), asi nunca se desincroniza.
 */
public class TimerForegroundService extends Service {

    public static final String ACTION_START = "com.julioborn.gymmy.timer.START";
    public static final String ACTION_PAUSE = "com.julioborn.gymmy.timer.PAUSE";
    public static final String ACTION_RESUME = "com.julioborn.gymmy.timer.RESUME";
    public static final String ACTION_STOP = "com.julioborn.gymmy.timer.STOP";

    public static final String EXTRA_STEPS_JSON = "stepsJson";
    public static final String EXTRA_START_AT = "startAt";

    private static final String CHANNEL_ID = "timer_intermitente";
    private static final int NOTIF_ID = 93001;

    private static class Step {
        String phase; // "prep" | "work" | "rest"
        int duration; // segundos
        int round;
    }

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final List<Step> steps = new ArrayList<>();
    private int stepIdx = 0;
    private long phaseEndAt = 0L;
    private long pausedRemainingMs = 0L;
    private boolean paused = false;
    private boolean running = false;
    private ToneGenerator toneGenerator;

    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            if (!running || paused) return;
            long remaining = phaseEndAt - System.currentTimeMillis();
            if (remaining <= 0) {
                advanceStep();
            } else {
                updateNotification(currentStep(), remaining);
                handler.postDelayed(this, 1000);
            }
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        toneGenerator = new ToneGenerator(AudioManager.STREAM_MUSIC, 90);
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || intent.getAction() == null) return START_NOT_STICKY;

        switch (intent.getAction()) {
            case ACTION_START:
                startTimer(intent);
                break;
            case ACTION_PAUSE:
                pauseTimer();
                break;
            case ACTION_RESUME:
                resumeTimer();
                break;
            case ACTION_STOP:
                stopTimer();
                break;
        }
        return START_NOT_STICKY;
    }

    private void startTimer(Intent intent) {
        steps.clear();
        try {
            JSONArray arr = new JSONArray(intent.getStringExtra(EXTRA_STEPS_JSON));
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                Step s = new Step();
                s.phase = o.getString("phase");
                s.duration = o.getInt("duration");
                s.round = o.getInt("round");
                steps.add(s);
            }
        } catch (JSONException e) {
            stopSelf();
            return;
        }
        if (steps.isEmpty()) { stopSelf(); return; }

        stepIdx = 0;
        paused = false;
        running = true;
        long startAt = intent.getLongExtra(EXTRA_START_AT, System.currentTimeMillis());
        phaseEndAt = startAt + steps.get(0).duration * 1000L;

        startForeground(NOTIF_ID, buildNotification(currentStep(), steps.get(0).duration * 1000L));
        playPhaseTone(currentStep().phase);
        handler.removeCallbacks(tick);
        handler.postDelayed(tick, 1000);
    }

    private void pauseTimer() {
        if (!running) return;
        paused = true;
        pausedRemainingMs = phaseEndAt - System.currentTimeMillis();
        handler.removeCallbacks(tick);
        updateNotification(currentStep(), pausedRemainingMs);
    }

    private void resumeTimer() {
        if (!running) return;
        paused = false;
        phaseEndAt = System.currentTimeMillis() + Math.max(0, pausedRemainingMs);
        handler.removeCallbacks(tick);
        handler.postDelayed(tick, 1000);
    }

    private void stopTimer() {
        running = false;
        handler.removeCallbacks(tick);
        stopForeground(true);
        stopSelf();
    }

    private Step currentStep() {
        return steps.get(Math.min(stepIdx, steps.size() - 1));
    }

    private void advanceStep() {
        stepIdx++;
        if (stepIdx >= steps.size()) {
            playDoneTone();
            vibrate(new long[]{0, 120, 80, 120, 80, 200});
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.notify(NOTIF_ID, buildDoneNotification());
            running = false;
            stopForeground(false);
            stopSelf();
            return;
        }
        Step step = currentStep();
        phaseEndAt = System.currentTimeMillis() + step.duration * 1000L;
        playPhaseTone(step.phase);
        vibrate(new long[]{0, 150, 100, 150});
        updateNotification(step, step.duration * 1000L);
        handler.postDelayed(tick, 1000);
    }

    private void playPhaseTone(String phase) {
        if (toneGenerator == null) return;
        int tone = "work".equals(phase)
            ? ToneGenerator.TONE_PROP_BEEP2
            : "rest".equals(phase)
                ? ToneGenerator.TONE_PROP_BEEP
                : ToneGenerator.TONE_PROP_ACK;
        toneGenerator.startTone(tone, 220);
        handler.postDelayed(() -> { if (toneGenerator != null) toneGenerator.startTone(tone, 220); }, 260);
    }

    private void playDoneTone() {
        if (toneGenerator == null) return;
        toneGenerator.startTone(ToneGenerator.TONE_PROP_BEEP2, 200);
        handler.postDelayed(() -> { if (toneGenerator != null) toneGenerator.startTone(ToneGenerator.TONE_PROP_BEEP2, 200); }, 250);
        handler.postDelayed(() -> { if (toneGenerator != null) toneGenerator.startTone(ToneGenerator.TONE_PROP_ACK, 350); }, 500);
    }

    private void vibrate(long[] pattern) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vm = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                if (vm != null) vm.getDefaultVibrator().vibrate(VibrationEffect.createWaveform(pattern, -1));
            } else {
                Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        v.vibrate(VibrationEffect.createWaveform(pattern, -1));
                    } else {
                        v.vibrate(pattern, -1);
                    }
                }
            }
        } catch (Exception ignored) {}
    }

    private String phaseLabel(String phase) {
        switch (phase) {
            case "work": return "Trabajo";
            case "rest": return "Descanso";
            case "prep": return "Preparate";
            default: return "Intermitente";
        }
    }

    private Notification buildNotification(Step step, long remainingMs) {
        long seconds = Math.max(0, remainingMs / 1000);
        String text = phaseLabel(step.phase) + " · " + (seconds / 60) + ":" + String.format("%02d", seconds % 60)
            + (step.round > 0 ? " · Ronda " + step.round : "");

        PendingIntent contentIntent = PendingIntent.getActivity(
            this, 0, new Intent(this, MainActivity.class),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("Timer Intermitente")
            .setContentText(text)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(contentIntent)
            .build();
    }

    private Notification buildDoneNotification() {
        PendingIntent contentIntent = PendingIntent.getActivity(
            this, 0, new Intent(this, MainActivity.class),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("Timer Intermitente")
            .setContentText("¡Entrenamiento completo!")
            .setOngoing(false)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(contentIntent)
            .build();
    }

    private void updateNotification(Step step, long remainingMs) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIF_ID, buildNotification(step, remainingMs));
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Timer Intermitente", NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Cuenta regresiva del timer intermitente en segundo plano");
            channel.setSound(null, null);
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        handler.removeCallbacksAndMessages(null);
        if (toneGenerator != null) {
            toneGenerator.release();
            toneGenerator = null;
        }
    }
}
