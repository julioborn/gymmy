import { registerPlugin } from '@capacitor/core';

export interface LiveActivityState {
    phase: 'prep' | 'work' | 'rest' | 'done';
    phaseLabel: string;
    round: number;
    totalRounds: number;
    /** epoch ms del fin de la fase actual */
    phaseEndsAt: number;
}

export interface LiveActivityPlugin {
    /** Arranca la Live Activity (lock screen + Dynamic Island) del timer. No-op si ya hay < iOS 16.2. */
    start(state: LiveActivityState): Promise<void>;
    /** Actualiza la fase/ronda/countdown de la Live Activity en curso. */
    update(state: LiveActivityState): Promise<void>;
    /** Cierra la Live Activity. */
    end(): Promise<void>;
}

const LiveActivity = registerPlugin<LiveActivityPlugin>('LiveActivity', {
    // Android/web — no-op, esto es exclusivo de iOS (Dynamic Island)
    web: {
        start: async () => {},
        update: async () => {},
        end: async () => {},
    },
});

export default LiveActivity;
