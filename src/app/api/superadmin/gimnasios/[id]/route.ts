import { NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Gimnasio from '@/models/Gimnasio';
import Alumno from '@/models/Alumno';
import { requireSuperAdmin } from '@/lib/requireAuth';
import { MongoClient } from 'mongodb';

async function getDb() {
    const USE_ATLAS = process.env.USE_ATLAS === 'true';
    const uri = USE_ATLAS ? process.env.ATLAS_URI : process.env.MONGODB_URI;
    if (!uri) throw new Error('Falta URI de MongoDB');
    const client = new MongoClient(uri);
    await client.connect();
    return { client, db: client.db(process.env.MONGODB_DB) };
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.error;

    await connectMongoDB();

    try {
        const gimnasio = await Gimnasio.findById(params.id).lean();
        if (!gimnasio || Array.isArray(gimnasio)) {
            return NextResponse.json({ error: 'Gimnasio no encontrado' }, { status: 404 });
        }

        const { client, db } = await getDb();
        try {
            const usuarios = await db
                .collection('usuarios')
                .find({ gimnasioId: gimnasio._id }, { projection: { password: 0 } })
                .toArray();

            const totalAlumnos = await Alumno.countDocuments({ gimnasioId: params.id });

            return NextResponse.json({ ...gimnasio, usuarios, totalAlumnos });
        } finally {
            await client.close();
        }
    } catch {
        return NextResponse.json({ error: 'Error al obtener el gimnasio' }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.error;

    await connectMongoDB();

    try {
        const { nombre, activo, fechaVencimiento } = await req.json();

        const gimnasio = await Gimnasio.findByIdAndUpdate(
            params.id,
            {
                ...(nombre !== undefined && { nombre }),
                ...(activo !== undefined && { activo }),
                ...(fechaVencimiento !== undefined && {
                    fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
                }),
            },
            { new: true }
        );

        if (!gimnasio) return NextResponse.json({ error: 'Gimnasio no encontrado' }, { status: 404 });

        return NextResponse.json(gimnasio);
    } catch {
        return NextResponse.json({ error: 'Error al actualizar el gimnasio' }, { status: 500 });
    }
}
