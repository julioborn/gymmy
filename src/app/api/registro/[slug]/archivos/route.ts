import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import Gimnasio from '@/models/Gimnasio';

export const dynamic = 'force-dynamic';

// POST: sube archivos médicos de un alumno recién registrado (sin auth)
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
    await connectMongoDB();

    const gym = await Gimnasio.findOne({ slug: params.slug }).select('_id activo');
    if (!gym || !gym.activo) {
        return NextResponse.json({ error: 'Gimnasio no encontrado' }, { status: 404 });
    }

    const formData = await req.formData();
    const alumnoId = formData.get('alumnoId') as string;

    if (!alumnoId) {
        return NextResponse.json({ error: 'alumnoId requerido' }, { status: 400 });
    }

    const alumno = await Alumno.findOne({ _id: alumnoId, gimnasioId: gym._id });
    if (!alumno) {
        return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 });
    }

    const files = formData.getAll('archivos') as File[];
    if (!files.length) {
        return NextResponse.json({ error: 'No se recibieron archivos' }, { status: 400 });
    }

    const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB por archivo

    const nuevosArchivos = [];
    for (const file of files) {
        if (!TIPOS_PERMITIDOS.includes(file.type)) continue;
        if (file.size > MAX_SIZE) continue;

        const ext = file.name.split('.').pop() ?? 'bin';
        const blobName = `medicos/${alumnoId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const blob = await put(blobName, file, { access: 'public' });

        nuevosArchivos.push({
            url: blob.url,
            nombre: file.name,
            tipo: file.type,
            fechaSubida: new Date(),
        });
    }

    if (nuevosArchivos.length) {
        await Alumno.findByIdAndUpdate(alumnoId, {
            $push: { archivosMedicos: { $each: nuevosArchivos } },
        });
    }

    return NextResponse.json({ ok: true, subidos: nuevosArchivos.length });
}
