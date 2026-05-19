import { NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Gimnasio from '@/models/Gimnasio';
import Alumno from '@/models/Alumno';
import { requireSuperAdmin } from '@/lib/requireAuth';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

async function getDb() {
    const USE_ATLAS = process.env.USE_ATLAS === 'true';
    const uri = USE_ATLAS ? process.env.ATLAS_URI : process.env.MONGODB_URI;
    if (!uri) throw new Error('Falta URI de MongoDB');
    const client = new MongoClient(uri);
    await client.connect();
    return { client, db: client.db(process.env.MONGODB_DB) };
}

export async function GET() {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.error;

    await connectMongoDB();

    try {
        const gimnasios = await Gimnasio.find().sort({ createdAt: -1 }).lean();

        const result = await Promise.all(
            gimnasios.map(async (g) => {
                const totalAlumnos = await Alumno.countDocuments({ gimnasioId: g._id });
                return { ...g, totalAlumnos };
            })
        );

        return NextResponse.json(result);
    } catch {
        return NextResponse.json({ error: 'Error al obtener gimnasios' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.error;

    await connectMongoDB();

    try {
        const { nombre, adminUsername, adminPassword, fechaVencimiento } = await req.json();

        if (!nombre || !adminUsername || !adminPassword) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        const gimnasio = await Gimnasio.create({
            nombre,
            activo: true,
            fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : undefined,
        });

        const { client, db } = await getDb();
        try {
            const existing = await db.collection('usuarios').findOne({ username: adminUsername });
            if (existing) {
                await Gimnasio.findByIdAndDelete(gimnasio._id);
                await client.close();
                return NextResponse.json({ error: 'El nombre de usuario ya existe' }, { status: 400 });
            }

            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            await db.collection('usuarios').insertOne({
                username: adminUsername,
                password: hashedPassword,
                role: 'admin',
                gimnasioId: gimnasio._id,
            });
        } finally {
            await client.close();
        }

        return NextResponse.json({ gimnasio }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Error al crear el gimnasio' }, { status: 500 });
    }
}
