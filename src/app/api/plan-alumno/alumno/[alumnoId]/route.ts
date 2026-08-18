import { NextRequest, NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import PlanAlumno from '@/models/PlanAlumno';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const dynamic = 'force-dynamic';

// GET: plan activo del alumno
export async function GET(_req: NextRequest, { params }: { params: { alumnoId: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    await connectMongoDB();
    const plan = await PlanAlumno.findOne({ alumnoId: params.alumnoId, activo: true }).sort({ createdAt: -1 });
    return NextResponse.json(plan || null);
}

// PATCH: alumno guarda sus KG y observaciones
export async function PATCH(req: NextRequest, { params }: { params: { alumnoId: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { planId, dias } = await req.json();
    if (!planId || !Array.isArray(dias)) {
        return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    await connectMongoDB();

    const plan = await PlanAlumno.findOne({ _id: planId, alumnoId: params.alumnoId, activo: true });
    if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });

    type ClientEj = Record<string, string | undefined>;
    type ClientDia = { ejercicios?: ClientEj[] };

    // Merge: only overwrite per-semana kg and observaciones, preserve everything else
    const updatedDias = plan.toObject().dias.map((dia: Record<string, unknown>, i: number) => {
        const clientDia = (dias as ClientDia[])[i];
        if (!clientDia) return dia;
        const ejercicios = (dia.ejercicios as Record<string, unknown>[]).map((ej: Record<string, unknown>, j: number) => {
            const clientEj = clientDia.ejercicios?.[j];
            if (!clientEj) return ej;
            const merged: Record<string, string> = {};
            for (let s = 1; s <= 5; s++) {
                const kk = `kgAlumno${s}`;
                const ok = `observacionesAlumno${s}`;
                merged[kk] = clientEj[kk] ?? (ej[kk] as string) ?? '';
                merged[ok] = clientEj[ok] ?? (ej[ok] as string) ?? '';
            }
            return { ...ej, ...merged };
        });
        return { ...dia, ejercicios };
    });

    await PlanAlumno.findOneAndUpdate(
        { _id: planId, alumnoId: params.alumnoId, activo: true },
        { $set: { dias: updatedDias } }
    );

    return NextResponse.json({ ok: true });
}
