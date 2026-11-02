export interface NotifPayload {
    title: string;
    body: string;
    url?: string;
    icon?: string;
    data?: Record<string, string>;
}

function getBaseUrl(): string {
    if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/$/, '');
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return 'https://sporttime.com.ar';
}

const DEFAULT_ICON = () => `${getBaseUrl()}/icons/icon-192x192.png`;

export async function sendToTokens(tokens: string[], payload: NotifPayload) {
    if (!tokens.length) return;

    const { default: admin } = await import('./firebaseAdmin');
    const icon = payload.icon || DEFAULT_ICON();

    const messages = tokens.map(token => ({
        token,
        notification: { title: payload.title, body: payload.body },
        data: { url: payload.url ?? '/', ...(payload.data ?? {}) },
        webpush: {
            fcmOptions: { link: payload.url ?? '/' },
            notification: {
                title: payload.title,
                body: payload.body,
                icon,
                badge: icon,
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

async function getGymIcon(gimnasioId: string): Promise<string> {
    try {
        const { default: connectMongoDB } = await import('./mongodb');
        const { default: mongoose } = await import('mongoose');
        await connectMongoDB();
        const gym = await mongoose.connection.db!
            .collection('gimnasios')
            .findOne(
                { _id: new mongoose.Types.ObjectId(gimnasioId) },
                { projection: { logoUrl: 1 } }
            ) as any;
        if (gym?.logoUrl) {
            const url = gym.logoUrl as string;
            return url.startsWith('http') ? url : `${getBaseUrl()}${url}`;
        }
        return DEFAULT_ICON();
    } catch {
        return DEFAULT_ICON();
    }
}

export async function sendGymNotif(gimnasioId: string | null | undefined, tokens: string[], payload: NotifPayload) {
    if (!tokens.length) return;
    const icon = await getGymIcon(gimnasioId ?? '');
    return sendToTokens(tokens, { ...payload, icon });
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
    return sendGymNotif(gimnasioId, tokens, payload);
}

export async function notifyVigilantes(alumnoId: string, gimnasioId: string, payload: NotifPayload) {
    const { default: connectMongoDB } = await import('./mongodb');
    const { default: Vigilancia } = await import('@/models/Vigilancia');
    const { default: Alumno } = await import('@/models/Alumno');
    await connectMongoDB();

    const vigilancias = await Vigilancia.find({ alumnoId }).select('watcherAlumnoId').lean();
    if (!vigilancias.length) return;

    const watcherIds = (vigilancias as any[]).map(v => v.watcherAlumnoId);
    const watchers = await Alumno.find({ _id: { $in: watcherIds } }).select('+fcmTokens').lean();
    const tokens = (watchers as any[]).flatMap(w => w.fcmTokens ?? []);
    if (!tokens.length) return;

    return sendGymNotif(gimnasioId, tokens, payload);
}
