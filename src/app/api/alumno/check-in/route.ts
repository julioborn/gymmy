import { NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import { requireAlumnoAuth } from '@/lib/requireAuth';
import { sendToTokens } from '@/lib/notifications';

// Devuelve "YYYY-MM-DD" en zona horaria Argentina (UTC-3)
function toArgDate(d: Date): string {
    const arg = new Date(d.getTime() - 3 * 60 * 60 * 1000);
    const y = arg.getUTCFullYear();
    const m = String(arg.getUTCMonth() + 1).padStart(2, '0');
    const day = String(arg.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export async function POST() {
    const auth = await requireAlumnoAuth();
    if (!auth.ok) return auth.error;

    const alumnoId = auth.session.user.id;

    await connectMongoDB();

    const alumno = await Alumno.findById(alumnoId).select('+fcmTokens');
    if (!alumno) {
        return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 });
    }

    const now = new Date();
    const actividad = 'Musculación';
    const presente = true;
    const todayArg = toArgDate(now);

    if (!alumno.asistencia) alumno.asistencia = [];

    const asistenciaExistente = alumno.asistencia.find(
        (a: any) => toArgDate(new Date(a.fecha)) === todayArg && a.actividad === actividad
    );

    if (asistenciaExistente) {
        return NextResponse.json({ error: 'Ya registraste asistencia hoy' }, { status: 400 });
    }

    alumno.asistencia.push({ fecha: now, presente, actividad });
    await alumno.save();

    if (alumno.fcmTokens?.length) {
        await sendToTokens(alumno.fcmTokens, {
            title: '📋 Asistencia registrada',
            body: 'Tu asistencia de musculación de hoy fue registrada. ¡Buen entrenamiento!',
            url: '/mi-cuenta',
        }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
}
