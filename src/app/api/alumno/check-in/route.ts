import { NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import { requireAlumnoAuth } from '@/lib/requireAuth';
import { sendToTokens } from '@/lib/notifications';

export async function POST() {
    const auth = await requireAlumnoAuth();
    if (!auth.ok) return auth.error;

    const alumnoId = auth.session.user.id;

    await connectMongoDB();

    const alumno = await Alumno.findById(alumnoId).select('+fcmTokens');
    if (!alumno) {
        return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 });
    }

    const fecha = new Date().toISOString();
    const actividad = 'Musculación';
    const presente = true;

    if (!alumno.asistencia) alumno.asistencia = [];

    const fechaAsistencia = new Date(fecha).toISOString().split('T')[0];
    const asistenciaExistente = alumno.asistencia.find(
        (a: { fecha: string; actividad: string }) =>
            new Date(a.fecha).toISOString().split('T')[0] === fechaAsistencia &&
            a.actividad === actividad
    );

    if (asistenciaExistente) {
        return NextResponse.json({ error: 'Ya registraste asistencia hoy' }, { status: 400 });
    }

    alumno.asistencia.push({ fecha, presente, actividad });
    await alumno.save();

    if (alumno.fcmTokens?.length) {
        sendToTokens(alumno.fcmTokens, {
            title: '📋 Asistencia registrada',
            body: 'Tu asistencia de musculación de hoy fue registrada. ¡Buen entrenamiento!',
            url: '/mi-cuenta',
        }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
}
