import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import mongoose from 'mongoose';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import transporter from '@/utils/email';

function maskEmail(email: string): string {
    const [user, domain] = email.split('@');
    return `${user[0]}***@${domain}`;
}

async function sendReset(alumno: any, emailDest: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 1000 * 60 * 60);
    await Alumno.updateOne(
        { _id: alumno._id },
        { $set: { resetPasswordToken: token, resetPasswordExpiry: expiry } }
    );

    const baseUrl = process.env.NEXTAUTH_URL || 'https://sporttime.com.ar';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    console.log('[forgot-password] Enviando email a:', emailDest);
    console.log('[forgot-password] EMAIL_USER:', process.env.EMAIL_USER);
    console.log('[forgot-password] Reset URL:', resetUrl);

    try {
        await transporter.sendMail({
            from: `"SportTime" <${process.env.EMAIL_USER}>`,
            to: emailDest,
            subject: 'Recuperar contraseña — SportTime',
            html: `
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
                    <h2 style="color:#111;margin-bottom:8px">Recuperar contraseña</h2>
                    <p style="color:#555;margin-bottom:24px">Hacé clic en el botón para crear una nueva contraseña. El link expira en 1 hora.</p>
                    <a href="${resetUrl}" style="display:inline-block;background:#f97316;color:#fff;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:16px">
                        Crear nueva contraseña
                    </a>
                    <p style="color:#aaa;font-size:12px;margin-top:32px">Si no solicitaste esto, ignorá este email.</p>
                </div>
            `,
        });
        console.log('[forgot-password] Email enviado OK');
    } catch (e) {
        console.error('[forgot-password] Error enviando email:', e);
        throw e;
    }
}

// GET: busca el alumno por DNI + gimnasioId y devuelve su email enmascarado
export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const dni = searchParams.get('dni');
    const gimnasioId = searchParams.get('gimnasioId');
    if (!dni || !gimnasioId) return NextResponse.json({ email: null });

    await connectMongoDB();
    const alumno = await Alumno.findOne({ dni, gimnasioId: new mongoose.Types.ObjectId(gimnasioId) });
    if (!alumno) return NextResponse.json({ email: null });

    return NextResponse.json({
        email: alumno.email ? maskEmail(alumno.email) : null,
        hasEmail: !!alumno.email,
    });
}

// POST: envía el link de reset (y guarda el email si es nuevo)
export async function POST(req: NextRequest) {
    const { email, dni, gimnasioId } = await req.json();

    await connectMongoDB();

    let alumno: any = null;
    let emailDest = email?.toLowerCase().trim() || '';

    if (dni && gimnasioId) {
        // Buscar por DNI + gimnasio
        alumno = await Alumno.findOne({ dni, gimnasioId: new mongoose.Types.ObjectId(gimnasioId) });
        if (!alumno) return NextResponse.json({ ok: true });

        if (emailDest) {
            // Guardar nuevo email en el perfil
            alumno.email = emailDest;
        } else {
            // Usar el email que ya tiene en DB
            emailDest = alumno.email || '';
        }
    } else {
        // Fallback: buscar por email directamente
        if (!emailDest) return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
        alumno = await Alumno.findOne({ email: emailDest });
    }

    if (!alumno || !emailDest) return NextResponse.json({ ok: true });

    await sendReset(alumno, emailDest);
    return NextResponse.json({ ok: true });
}
