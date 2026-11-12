import { Capacitor, registerPlugin } from '@capacitor/core';

export type NativeTimerStep = { phase: 'prep' | 'work' | 'rest'; duration: number; round: number };

interface TimerServicePlugin {
    start(options: { steps: NativeTimerStep[]; startAt: number }): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    stop(): Promise<void>;
}

const TimerServiceNative = registerPlugin<TimerServicePlugin>('TimerService');

// El timer intermitente sigue corriendo en segundo plano (notificacion + beeps)
// via un foreground service nativo de Android; en iOS/web no hace nada, el
// timer visual sigue manejando todo como siempre.
function isAndroidNative(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export const nativeTimerService = {
    async start(steps: NativeTimerStep[], startAt: number) {
        if (!isAndroidNative()) return;
        try { await TimerServiceNative.start({ steps, startAt }); } catch {}
    },
    async pause() {
        if (!isAndroidNative()) return;
        try { await TimerServiceNative.pause(); } catch {}
    },
    async resume() {
        if (!isAndroidNative()) return;
        try { await TimerServiceNative.resume(); } catch {}
    },
    async stop() {
        if (!isAndroidNative()) return;
        try { await TimerServiceNative.stop(); } catch {}
    },
};
