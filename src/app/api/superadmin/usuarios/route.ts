import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/requireAuth';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

async function getDb() {
    const USE_ATLAS = process.env.USE_ATLAS === 'true';
    const uri = USE_ATLAS ? process.env.ATLAS_URI : process.env.MONGODB_URI;
    if (!uri) throw new Error('Falta URI de MongoDB');
    const client = new MongoClient(uri);
    await client.connect();
    return { client, db: client.db(process.env.MONGODB_DB) };
}

export async function POST(req: Request) {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.error;

    try {
        const { username, password, role, gimnasioId } = await req.json();

        if (!username || !password || !role || !gimnasioId) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        if (!['admin', 'registro'].includes(role)) {
            return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
        }

        const { client, db } = await getDb();
        try {
            const existing = await db.collection('usuarios').findOne({ username });
            if (existing) {
                return NextResponse.json({ error: 'El nombre de usuario ya existe' }, { status: 400 });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const result = await db.collection('usuarios').insertOne({
                username,
                password: hashedPassword,
                role,
                gimnasioId: new ObjectId(gimnasioId),
            });

            return NextResponse.json({ id: result.insertedId, username, role }, { status: 201 });
        } finally {
            await client.close();
        }
    } catch {
        return NextResponse.json({ error: 'Error al crear el usuario' }, { status: 500 });
    }
}
