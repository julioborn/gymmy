import { NextRequest, NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Gimnasio from '@/models/Gimnasio';
import Alumno from '@/models/Alumno';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
    await connectMongoDB();
    const gym = await Gimnasio.findOne({ slug: params.slug }).select('nombre slug activo logoUrl');
    if (!gym || !gym.activo) {
        return NextResponse.json({ error: 'Gimnasio no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ nombre: gym.nombre, alias: gym.slug, logoUrl: gym.logoUrl ?? null });
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
    await connectMongoDB();

    const gym = await Gimnasio.findOne({ slug: params.slug }).select('_id activo');
    if (!gym || !gym.activo) {
        return NextResponse.json({ error: 'Gimnasio no encontrado' }, { status: 404 });
    }

    const {
        nombre, apellido, dni, fechaNacimiento,
        telefono,
        area, nivelExperiencia, diasEntrenaSemana,
        horarioEntrenamiento, patologias,
    } = await req.json();

    if (!nombre || !apellido || !dni || !fechaNacimiento || !telefono) {
        return NextResponse.json({ error: 'Completá los campos obligatorios' }, { status: 400 });
    }

    const existing = await Alumno.findOne({ dni, gimnasioId: gym._id });
    if (existing) {
        return NextResponse.json({ error: 'Ya existe un alumno con ese DNI' }, { status: 409 });
    }

    await Alumno.create({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dni: dni.trim(),
        fechaNacimiento: new Date(fechaNacimiento),
        telefono: telefono.trim(),
        area: area || null,
        nivelExperiencia: nivelExperiencia || null,
        diasEntrenaSemana: diasEntrenaSemana ? Number(diasEntrenaSemana) : null,
        horarioEntrenamiento: horarioEntrenamiento || null,
        patologias: patologias?.trim() || '',
        gimnasioId: gym._id,
    });

    return NextResponse.json({ ok: true });
}
