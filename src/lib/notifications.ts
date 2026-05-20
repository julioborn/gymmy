export interface NotifPayload {
    title: string;
    body: string;
    url?: string;
    data?: Record<string, string>;
}

export async function sendToTokens(tokens: string[], payload: NotifPayload) {
    if (!tokens.length) return;

    const { default: admin } = await import('./firebaseAdmin');

    const messages = tokens.map(token => ({
        token,
        notification: { title: payload.title, body: payload.body },
        data: { url: payload.url ?? '/', ...(payload.data ?? {}) },
        webpush: {
            fcmOptions: { link: payload.url ?? '/' },
            notification: {
                title: payload.title,
                body: payload.body,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-192x192.png',
                requireInteraction: false,
            },
        },
        apns: {
            payload: {
                aps: { alert: { title: payload.title, body: payload.body }, sound: 'default' },
            },
        },
    }));

    try {
        const result = await admin.messaging().sendEach(messages);
        return result;
    } catch (e) {
        console.error('[FCM] Error sending notifications:', e);
    }
}

export async function sendToToken(token: string, payload: NotifPayload) {
    return sendToTokens([token], payload);
}

export async function getOwnerTokens(gimnasioId: string): Promise<string[]> {
    const { default: connectMongoDB } = await import('./mongodb');
    const { default: mongoose } = await import('mongoose');
    await connectMongoDB();
    const db = mongoose.connection.db!;
    const usuarios = await db.collection('usuarios').find({
        gimnasioId,
        role: { $in: ['dueño', 'admin'] },
        fcmTokens: { $exists: true, $not: { $size: 0 } },
    }).toArray();
    return usuarios.flatMap((u: any) => u.fcmTokens ?? []);
}

export async function notifyOwners(gimnasioId: string, payload: NotifPayload) {
    if (!gimnasioId) return;
    const tokens = await getOwnerTokens(gimnasioId);
    if (!tokens.length) return;
    return sendToTokens(tokens, payload);
}
