import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import Gasto from '@/models/Gasto';
import Ingreso from '@/models/Ingreso';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
    const authError = await requireAuth();
    if (authError) return authError;

    await connectMongoDB();

    const now = new Date();
    const mesActual = now.toLocaleString('es-ES', { month: 'long' }).toLowerCase();
    const anioActual = now.getFullYear();
    const mesIdx = now.getMonth();

    const inicioMes = new Date(anioActual, mesIdx, 1);
    const finMes = new Date(anioActual, mesIdx + 1, 0, 23, 59, 59);
    const inicioHoy = new Date(now); inicioHoy.setHours(0, 0, 0, 0);
    const finHoy = new Date(now); finHoy.setHours(23, 59, 59, 999);

    const [alumnos, gastosData, ingresosData] = await Promise.all([
        Alumno.find({}).lean(),
        Gasto.find({ fecha: { $gte: inicioMes, $lte: finMes } }).lean(),
        Ingreso.find({ fecha: { $gte: inicioMes, $lte: finMes } }).lean(),
    ]);

    const totalAlumnos = alumnos.length;

    // % pagaron este mes
    const pagados = alumnos.filter(a =>
        (a.pagos as any[]).some(p => p.mes.toLowerCase() === mesActual)
    ).length;

    // Planes por vencer (0-5 días)
    const planesVenciendo = alumnos
        .filter(a => (a.planEntrenamiento as any)?.fechaInicio && !(a.planEntrenamiento as any).terminado)
        .map(a => {
            const plan = a.planEntrenamiento as any;
            const fechaInicio = new Date(plan.fechaInicio);
            const asistencias = (a.asistencia as any[]).filter(s =>
                s.actividad === 'Musculación' && s.presente && new Date(s.fecha) >= fechaInicio
            ).length;
            return {
                _id: String(a._id),
                nombre: a.nombre,
                apellido: a.apellido,
                diasRestantes: plan.duracion - asistencias,
            };
        })
        .filter(a => a.diasRestantes >= 0 && a.diasRestantes <= 5)
        .sort((a, b) => a.diasRestantes - b.diasRestantes);

    // Horario pico del mes (hora más frecuente en asistencias)
    const horasEsteMes: number[] = [];
    for (const a of alumnos) {
        for (const s of a.asistencia as any[]) {
            if (!s.presente) continue;
            const f = new Date(s.fecha);
            if (f.getFullYear() === anioActual && f.getMonth() === mesIdx) {
                horasEsteMes.push(f.getHours());
            }
        }
    }
    let horaPico: string | null = null;
    if (horasEsteMes.length > 0) {
        const freq: Record<number, number> = {};
        horasEsteMes.forEach(h => { freq[h] = (freq[h] || 0) + 1; });
        const peak = Number(Object.entries(freq).sort(([, a], [, b]) => b - a)[0][0]);
        horaPico = `${peak.toString().padStart(2, '0')}:00`;
    }

    // Asistencias hoy
    const asistenciasHoy = alumnos.reduce((count, a) => {
        const vino = (a.asistencia as any[]).some(s => {
            const f = new Date(s.fecha);
            return s.presente && f >= inicioHoy && f <= finHoy;
        });
        return count + (vino ? 1 : 0);
    }, 0);

    // Financiero del mes
    const ingresosCuotas = alumnos.reduce((sum, a) => {
        return sum + (a.pagos as any[])
            .filter(p => {
                const f = new Date(p.fechaPago);
                return p.mes.toLowerCase() === mesActual && f.getFullYear() === anioActual;
            })
            .reduce((s: number, p: any) => s + (p.totalPagado ?? p.tarifa ?? 0), 0);
    }, 0);

    const gastosMes = (gastosData as any[]).reduce((s, g) => s + g.importe, 0);
    const ingresosExtra = (ingresosData as any[]).reduce((s, i) => s + i.importe, 0);

    return NextResponse.json({
        ok: true,
        totalAlumnos,
        pagados,
        porcentajePagados: totalAlumnos > 0 ? Math.round((pagados / totalAlumnos) * 100) : 0,
        planesVenciendo,
        horaPico,
        asistenciasHoy,
        ingresosCuotas,
        ingresosExtra,
        gastosMes,
        balance: ingresosCuotas + ingresosExtra - gastosMes,
        mes: mesActual,
    });
}
