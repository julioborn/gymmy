export const dynamic = 'force-dynamic';

export async function GET() {
    const config = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
    };

    const sw = `
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

firebase.initializeApp(${JSON.stringify(config)});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
    const title = payload.notification?.title || 'Gymmy';
    const body  = payload.notification?.body  || '';
    const url   = payload.data?.url || '/';

    self.registration.showNotification(title, {
        body,
        icon:  '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        data:  { url },
    });
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(clients.openWindow(url));
});
`.trim();

    return new Response(sw, {
        headers: {
            'Content-Type': 'application/javascript',
            'Service-Worker-Allowed': '/',
            'Cache-Control': 'no-cache',
        },
    });
}
