import connectMongoDB from './mongodb';
import Alumno from '@/models/Alumno';
import { sendToTokens, notifyOwners } from './notifications';
import mongoose from 'mongoose';

// Notifica alumnos que no pagaron el mes actual y estamos en los últimos días del mes
export async function cronVencimientoCuotas() {
    const hoy = new Date();
    const dia = hoy.getDate();
    if (dia < 24) return; // Solo correr desde el día 24

    await connectMongoDB();

    const mesActual = hoy.toLocaleString('es-ES', { month: 'long' }).toLowerCase();

    const alumnos = await Alumno.find({}).select('+fcmTokens').lean();

    for (const alumno of alumnos) {
        if (!alumno.fcmTokens?.length) continue;
        const pagoCorriente = alumno.pagos.some(
            (p: any) => p.mes.toLowerCase() === mesActual
        );
        if (!pagoCorriente) {
            await sendToTokens(alumno.fcmTokens, {
                title: '⚠️ Cuota pendiente',
                body: `Recordá abonar tu cuota de ${mesActual}. ¡Gracias!`,
                url: '/mi-cuenta',
            });
        }
    }
    // Notificar a dueños por gimnasio con el conteo de morosos
    const morososPorGimnasio: Record<string, number> = {};
    for (const alumno of alumnos) {
        const pagoCorriente = alumno.pagos.some(
            (p: any) => p.mes.toLowerCase() === mesActual
        );
        if (!pagoCorriente) {
            const gid = alumno.gimnasioId?.toString();
            if (gid) morososPorGimnasio[gid] = (morososPorGimnasio[gid] ?? 0) + 1;
        }
    }
    for (const [gid, cantidad] of Object.entries(morososPorGimnasio)) {
        await notifyOwners(gid, {
            title: '⚠️ Cuotas pendientes',
            body: `${cantidad} alumno${cantidad > 1 ? 's' : ''} aún no pagó la cuota de ${mesActual}.`,
            url: '/',
        });
    }

    console.log('[Cron] vencimiento cuotas procesado');
}

// Notifica alumnos con más de 7 días sin asistencia y plan activo
export async function cronAusenciaProlongada() {
    await connectMongoDB();

    const hoy = new Date();
    const hace7dias = new Date(hoy);
    hace7dias.setDate(hoy.getDate() - 7);

    const alumnos = await Alumno.find({
        'planEntrenamiento.terminado': false,
        'planEntrenamiento.fechaInicio': { $ne: null },
    }).select('+fcmTokens').lean();

    for (const alumno of alumnos) {
        if (!alumno.fcmTokens?.length) continue;

        const asistencias: any[] = alumno.asistencia ?? [];
        const presentes = asistencias.filter((a: any) => a.presente);

        if (!presentes.length) continue;

        const ultima = presentes.reduce((max: any, a: any) =>
            new Date(a.fecha) > new Date(max.fecha) ? a : max
        );

        const diasAusente = Math.floor(
            (hoy.getTime() - new Date(ultima.fecha).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diasAusente >= 7) {
            await sendToTokens(alumno.fcmTokens, {
                title: '🏃 ¡Te extrañamos!',
                body: `Hace ${diasAusente} días que no venís al gym. ¡Volvé a entrenar!`,
                url: '/mi-cuenta',
            });
        }
    }
    console.log('[Cron] ausencia prolongada procesado');
}
