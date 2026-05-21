import type { CapacitorConfig } from '@capacitor/cli';

const isProduction = process.env.NODE_ENV === 'production';

const config: CapacitorConfig = {
  appId: 'com.julioborn.gymmy',
  appName: 'Gymmy',
  webDir: 'out',
  server: {
    url: isProduction
      ? 'https://gymmy.com.ar'
      : 'http://192.168.1.91:3000',
    cleartext: true,
  },
  ios: {
    // Dark background while the remote URL loads — prevents the white frozen screen
    backgroundColor: '#0f172a',
  },
  plugins: {
    FirebaseMessaging: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
