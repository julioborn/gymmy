importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyAAOp7XBYfa8oIWiqXqjbtY21B2wRW6p2w",
    authDomain: "gymmy-firebase.firebaseapp.com",
    projectId: "gymmy-firebase",
    storageBucket: "gymmy-firebase.firebasestorage.app",
    messagingSenderId: "115568601521",
    appId: "1:115568601521:web:d8936bd8cf86a8302e7590",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
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

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(clients.openWindow(url));
});
