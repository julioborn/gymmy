import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import { requireGymAuth } from '@/lib/requireAuth';
import { NextResponse } from 'next/server';

function detectarProblemas(valor: string): string[] {
    const problemas: string[] = [];
    if (!valor) return ['vacío'];
    const trimmed = valor.trim();
    if (trimmed !== valor) problemas.push('espacios al inicio/final');
    if (/\s{2,}/.test(valor)) problemas.push('espacios dobles');
    if (/[0-9]/.test(valor)) problemas.push('contiene números');
    if (/[^a-zA-ZÀ-ÿñÑ\s.'-]/.test(valor)) problemas.push('caracteres raros');

    const soloLetras = trimmed.replace(/[^a-zA-ZÀ-ÿñÑ]/g, '');
    if (soloLetras.length > 1) {
        if (trimmed === trimmed.toUpperCase() && trimmed !== trimmed.toLowerCase()) {
            problemas.push('todo en MAYÚSCULA');
        } else if (trimmed === trimmed.toLowerCase() && trimmed !== trimmed.toUpperCase()) {
            problemas.push('todo en minúscula');
        } else {
            const palabras = trimmed.split(/[\s'-]+/).filter(Boolean);
            const malFormada = palabras.some(p => p.length > 1 && !/^[A-ZÀ-Ý][a-zà-ÿ]*$/.test(p));
            if (malFormada) problemas.push('capitalización irregular');
        }
    }
    if (trimmed.length === 1) problemas.push('muy corto');
    return problemas;
}

export async function GET() {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;
    const { gimnasioId, role } = auth.session.user;

    if (!['dueño', 'admin'].includes(role ?? '')) {
        return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    await connectMongoDB();

    const alumnos = await Alumno.find({ gimnasioId }, { nombre: 1, apellido: 1, dni: 1 }).lean();

    const resultado = alumnos
        .map((a: any) => ({
            _id: String(a._id),
            nombre: a.nombre as string,
            apellido: a.apellido as string,
            dni: a.dni as string,
            problemasNombre: detectarProblemas(a.nombre || ''),
            problemasApellido: detectarProblemas(a.apellido || ''),
        }))
        .filter(a => a.problemasNombre.length > 0 || a.problemasApellido.length > 0)
        .sort((a, b) => `${a.apellido}${a.nombre}`.localeCompare(`${b.apellido}${b.nombre}`, 'es'));

    return NextResponse.json({ ok: true, total: alumnos.length, flagged: resultado.length, resultado });
}
