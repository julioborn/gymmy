import { registerPlugin } from '@capacitor/core';

export interface AppIconPlugin {
    /** Switch the app icon. Use "default" for the Gymmy icon or "Sporttime" for the gym icon. */
    setIcon(options: { iconName: string }): Promise<void>;
    /** Returns the current logical icon name ("default" or "Sporttime"). */
    getIcon(): Promise<{ iconName: string }>;
}

const AppIcon = registerPlugin<AppIconPlugin>('AppIcon', {
    // Web stub — no-op on browser
    web: {
        setIcon: async () => {},
        getIcon: async () => ({ iconName: 'default' }),
    },
});

export default AppIcon;
