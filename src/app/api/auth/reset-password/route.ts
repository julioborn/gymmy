import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';

export async function POST(req: NextRequest) {
    const { token, password } = await req.json();
    if (!token || !password) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

    await connectMongoDB();

    const alumno = await Alumno.findOne({
        resetPasswordToken: token,
        resetPasswordExpiry: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpiry');

    if (!alumno) return NextResponse.json({ error: 'El link expiró o no es válido' }, { status: 400 });

    alumno.password = await bcrypt.hash(password, 10);
    alumno.resetPasswordToken = undefined;
    alumno.resetPasswordExpiry = undefined;
    await alumno.save();

    return NextResponse.json({ ok: true });
}
