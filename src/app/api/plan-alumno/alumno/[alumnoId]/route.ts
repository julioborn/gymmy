import { NextRequest, NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import PlanAlumno from '@/models/PlanAlumno';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// GET: return active plan for a student (used by student and by professor)
export async function GET(_req: NextRequest, { params }: { params: { alumnoId: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    await connectMongoDB();
    const plan = await PlanAlumno.findOne({ alumnoId: params.alumnoId, activo: true }).sort({ createdAt: -1 });
    return NextResponse.json(plan || null);
}

// PATCH: student updates only their own kgAlumno and observacionesAlumno per exercise
export async function PATCH(req: NextRequest, { params }: { params: { alumnoId: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { planId, dias } = await req.json();
    if (!planId || !dias) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

    await connectMongoDB();
    const plan = await PlanAlumno.findOne({ _id: planId, alumnoId: params.alumnoId, activo: true });
    if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });

    // Only overwrite student-owned fields
    const rawDias = plan.toObject().dias as {
        titulo: string; descripcion: string; bloqueActivacion: string;
        ejercicios: { nombre: string; notas: string; semana1_5: string; semana2_6: string; semana3: string; semana4: string; kg: string; kgAlumno: string; observacionesAlumno: string }[];
    }[];

    plan.dias = rawDias.map((dia, i) => {
        const updatedDia = dias[i];
        if (!updatedDia) return dia;
        return {
            ...dia,
            ejercicios: dia.ejercicios.map((ej, j) => {
                const updatedEj = updatedDia.ejercicios?.[j];
                if (!updatedEj) return ej;
                return {
                    ...ej,
                    kgAlumno: updatedEj.kgAlumno ?? ej.kgAlumno,
                    observacionesAlumno: updatedEj.observacionesAlumno ?? ej.observacionesAlumno,
                };
            }),
        };
    });

    await plan.save();
    return NextResponse.json({ ok: true });
}
