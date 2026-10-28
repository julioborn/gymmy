import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import transporter from '@/utils/email';

export async function POST(req: NextRequest) {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 });

    await connectMongoDB();

    const alumno = await Alumno.findOne({ email: email.toLowerCase().trim() });

    // Siempre responder OK para no revelar si el email existe o no
    if (!alumno) return NextResponse.json({ ok: true });

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hora

    alumno.resetPasswordToken = token;
    alumno.resetPasswordExpiry = expiry;
    await alumno.save();

    const baseUrl = process.env.NEXTAUTH_URL || 'https://sporttime.com.ar';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await transporter.sendMail({
        from: `"SportTime" <${process.env.EMAIL_USER}>`,
        to: email,
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

    return NextResponse.json({ ok: true });
}
