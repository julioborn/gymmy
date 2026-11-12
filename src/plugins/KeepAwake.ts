import { registerPlugin } from '@capacitor/core';

export interface KeepAwakePlugin {
    /** Evita que la pantalla se apague (via UIApplication.isIdleTimerDisabled en iOS). */
    keepAwake(): Promise<void>;
    /** Vuelve al comportamiento normal de apagado de pantalla. */
    allowSleep(): Promise<void>;
}

const KeepAwake = registerPlugin<KeepAwakePlugin>('KeepAwake', {
    // Web/Android — no-op, esas plataformas usan navigator.wakeLock
    web: {
        keepAwake: async () => {},
        allowSleep: async () => {},
    },
});

export default KeepAwake;
