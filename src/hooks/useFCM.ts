'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

async function isCapacitor(): Promise<boolean> {
    try {
        const { Capacitor } = await import('@capacitor/core');
        return Capacitor.isNativePlatform();
    } catch {
        return false;
    }
}

async function registerToken(token: string) {
    await fetch('/api/fcm/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
    });
}

async function initNativeFCM() {
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');

    const { receive } = await FirebaseMessaging.requestPermissions();
    if (receive !== 'granted') return;

    const { token } = await FirebaseMessaging.getToken();
    if (!token) return;

    await registerToken(token);

    FirebaseMessaging.addListener('notificationReceived', async (event) => {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const { display } = await LocalNotifications.checkPermissions();
        if (display !== 'granted') await LocalNotifications.requestPermissions();
        await LocalNotifications.schedule({
            notifications: [{
                id: Date.now(),
                title: event.notification.title ?? 'Gymmy',
                body:  event.notification.body  ?? '',
                extra: { url: (event.notification.data as any)?.url ?? '/' },
            }],
        });
    });

    FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
        const url = (event.notification.data as any)?.url;
        if (url) window.location.href = url;
    });
}

async function initWebFCM() {
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) return;

    const { getMessagingInstance } = await import('@/lib/firebase');
    const { getToken, onMessage } = await import('firebase/messaging');

    const messaging = await getMessagingInstance();
    if (!messaging) return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const existing = await navigator.serviceWorker.getRegistrations();
    for (const reg of existing) {
        const url = reg.active?.scriptURL ?? reg.installing?.scriptURL ?? reg.waiting?.scriptURL ?? '';
        if (!url.includes('firebase-messaging-sw')) await reg.unregister();
    }
    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;

    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg });
    if (!token) return;

    await registerToken(token);

    onMessage(messaging, async (payload) => {
        const title = payload.notification?.title ?? 'Gymmy';
        const body  = payload.notification?.body  ?? '';
        const url   = payload.data?.url ?? '/';
        if (Notification.permission === 'granted') {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification(title, {
                body,
                icon:  '/icons/icon-192x192.png',
                badge: '/icons/icon-192x192.png',
                data:  { url },
            });
        }
    });
}

export function useFCM() {
    const { status } = useSession();
    const initialized = useRef(false);

    useEffect(() => {
        if (status !== 'authenticated' || initialized.current) return;
        initialized.current = true;

        (async () => {
            try {
                if (await isCapacitor()) {
                    await initNativeFCM();
                } else {
                    await initWebFCM();
                }
            } catch (e) {
                console.error('[FCM] init error:', e);
            }
        })();
    }, [status]);
}
