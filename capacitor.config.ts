import type { CapacitorConfig } from '@capacitor/cli';

// Para desarrollo local, corré: npm run cap:sync:dev
const isDevelopment = process.env.NODE_ENV === 'development';

const config: CapacitorConfig = {
  appId: 'com.julioborn.gymmy',
  appName: 'Gymmy',
  webDir: 'out',
  server: {
    url: isDevelopment ? 'http://192.168.1.91:3000' : 'https://gymmy.com.ar',
    cleartext: isDevelopment,
    allowNavigation: ['*'],
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
