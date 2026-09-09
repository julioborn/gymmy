import { NextRequest, NextResponse } from 'next/server';
import { requireGymAuth } from '@/lib/requireAuth';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongoClient';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

const ROLES_VALIDOS = ['dueño', 'admin', 'profesor', 'registro'];

export async function GET() {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;

    const { gimnasioId, role } = auth.session.user;
    if (role !== 'dueño' && role !== 'admin') {
        return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    const { db } = await getDb();
    const empleados = await db
        .collection('usuarios')
        .find(
            { gimnasioId: new ObjectId(gimnasioId!) },
            { projection: { password: 0 } }
        )
        .toArray();

    return NextResponse.json({ empleados });
}

export async function POST(req: NextRequest) {
    const auth = await requireGymAuth();
    if (!auth.ok) return auth.error;

    const { gimnasioId, role } = auth.session.user;
    if (role !== 'dueño' && role !== 'admin') {
        return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    const { username, password, role: nuevoRol } = await req.json();

    if (!username?.trim() || !password || !nuevoRol) {
        return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }
    if (!ROLES_VALIDOS.includes(nuevoRol)) {
        return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }
    if (password.length < 6) {
        return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const { db } = await getDb();
    const existing = await db.collection('usuarios').findOne({ username: username.trim() });
    if (existing) {
        return NextResponse.json({ error: 'El nombre de usuario ya existe' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.collection('usuarios').insertOne({
        username: username.trim(),
        password: hashedPassword,
        role: nuevoRol,
        gimnasioId: new ObjectId(gimnasioId!),
    });

    return NextResponse.json(
        { id: result.insertedId, username: username.trim(), role: nuevoRol },
        { status: 201 }
    );
}
