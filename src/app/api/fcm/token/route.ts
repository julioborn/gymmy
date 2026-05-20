import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { token } = await req.json();
    if (!token || typeof token !== 'string') {
        return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
    }

    await connectMongoDB();

    const { id, role } = session.user as any;

    if (role === 'alumno') {
        await Alumno.updateOne({ _id: id }, { $addToSet: { fcmTokens: token } });
    } else {
        const db = mongoose.connection.db!;
        await db.collection('usuarios').updateOne(
            { _id: new ObjectId(id) },
            { $addToSet: { fcmTokens: token } }
        );
    }

    return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 });

    await connectMongoDB();

    const { id, role } = session.user as any;

    if (role === 'alumno') {
        await Alumno.updateOne({ _id: id }, { $pull: { fcmTokens: token } });
    } else {
        const db = mongoose.connection.db!;
        await db.collection('usuarios').updateOne(
            { _id: new ObjectId(id) },
            { $pull: { fcmTokens: token } }
        );
    }

    return NextResponse.json({ ok: true });
}
