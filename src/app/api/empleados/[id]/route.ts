import { NextRequest, NextResponse } from 'next/server';
import { requireGymAuth } from '@/lib/requireAuth';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

const ROLES_VALIDOS = ['dueño', 'admin', 'profesor', 'registro'];

async function getDb() {
    const uri = process.env.USE_ATLAS === 'true' ? process.env.ATLAS_URI : process.env.MONGODB_URI;
    if (!uri) throw new Error('Falta URI de MongoDB');
    const client = new MongoClient(uri);
    await client.connect();
    return { client, db: client.db(process.env.MONGODB_DB) };
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;

    const { gimnasioId, role } = auth.session.user;
    if (role !== 'dueño' && role !== 'admin') {
        return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    const { username, role: nuevoRol, password, nombre, apellido, dni, fechaNacimiento } = await req.json();

    if (!username?.trim() || !nuevoRol) {
        return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }
    if (!ROLES_VALIDOS.includes(nuevoRol)) {
        return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }
    if (password && password.length < 6) {
        return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const { client, db } = await getDb();
    try {
        const empleado = await db.collection('usuarios').findOne({ _id: new ObjectId(params.id) });
        if (!empleado || String(empleado.gimnasioId) !== gimnasioId) {
            return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
        }

        if (username.trim() !== empleado.username) {
            const conflict = await db.collection('usuarios').findOne({ username: username.trim() });
            if (conflict) {
                return NextResponse.json({ error: 'El nombre de usuario ya existe' }, { status: 400 });
            }
        }

        const update: Record<string, unknown> = { username: username.trim(), role: nuevoRol };
        if (password) update.password = await bcrypt.hash(password, 10);
        if (nombre) update.nombre = nombre.trim();
        if (apellido) update.apellido = apellido.trim();
        if (dni) update.dni = dni.trim();
        if (fechaNacimiento) update.fechaNacimiento = new Date(fechaNacimiento);

        await db.collection('usuarios').updateOne(
            { _id: new ObjectId(params.id) },
            { $set: update }
        );

        return NextResponse.json({ ok: true });
    } finally {
        await client.close();
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;

    const { gimnasioId, role, id: myId } = auth.session.user;
    if (role !== 'dueño' && role !== 'admin') {
        return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }
    if (params.id === myId) {
        return NextResponse.json({ error: 'No podés eliminar tu propia cuenta' }, { status: 400 });
    }

    const { client, db } = await getDb();
    try {
        const empleado = await db.collection('usuarios').findOne({ _id: new ObjectId(params.id) });
        if (!empleado || String(empleado.gimnasioId) !== gimnasioId) {
            return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
        }

        await db.collection('usuarios').deleteOne({ _id: new ObjectId(params.id) });
        return NextResponse.json({ ok: true });
    } finally {
        await client.close();
    }
}
