import type { CapacitorConfig } from '@capacitor/cli';

// Para desarrollo local, corré: npx cap sync (sin NODE_ENV=production)
const isProduction = process.env.NODE_ENV === 'production';

const config: CapacitorConfig = {
  appId: 'com.julioborn.gymmy',
  appName: 'Gymmy',
  webDir: 'out',
  server: {
    url: isProduction
      ? 'https://gymmy.com.ar'
      : 'http://192.168.1.91:3000',
    cleartext: !isProduction,
  },
  ios: {
    backgroundColor: '#0f172a',
  },
  plugins: {
    FirebaseMessaging: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
