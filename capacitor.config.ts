import type { CapacitorConfig } from '@capacitor/cli';

const isProduction = process.env.NODE_ENV === 'production';

const config: CapacitorConfig = {
  appId: 'com.julioborn.gymmy',
  appName: 'Gymmy',
  webDir: 'out',
  server: {
    // En producción apunta al servidor desplegado; en dev a la IP local
    url: isProduction
      ? 'https://gymmy.com.ar'
      : 'http://192.168.1.91:3000',
    cleartext: true,
  },
  plugins: {
    FirebaseMessaging: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
