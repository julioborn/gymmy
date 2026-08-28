import { NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import Gimnasio from '@/models/Gimnasio';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const dni = searchParams.get('dni');

    if (!dni) return NextResponse.json({ error: 'DNI requerido' }, { status: 400 });

    await connectMongoDB();

    // Dos queries separadas: una con populate para datos generales,
    // otra con +password para el campo que tiene select:false
    const [alumnos, alumnosConPwd] = await Promise.all([
        Alumno.find({ dni }).populate({ path: 'gimnasioId', model: Gimnasio, select: 'nombre activo logoUrl logoHeaderUrl' }),
        Alumno.find({ dni }).select('+password').lean(),
    ]);

    if (alumnos.length === 0) {
        return NextResponse.json({ found: false });
    }

    // Mapa de _id → hasPassword
    const pwdMap: Record<string, boolean> = {};
    for (const a of alumnosConPwd as any[]) {
        pwdMap[a._id.toString()] = !!a.password;
    }

    // Filtrar solo de gimnasios activos
    const activos = alumnos.filter((a: any) => a.gimnasioId?.activo !== false);

    if (activos.length === 0) {
        return NextResponse.json({ found: false });
    }

    if (activos.length === 1) {
        const a = activos[0];
        const gym = a.gimnasioId as any;
        return NextResponse.json({
            found: true,
            multiple: false,
            nombre: a.nombre,
            apellido: a.apellido,
            hasPassword: pwdMap[a._id.toString()] ?? false,
            gimnasioId: gym._id.toString(),
            gimnasioNombre: gym.nombre,
            gimnasioLogoUrl: gym.logoHeaderUrl || gym.logoUrl || null,
        });
    }

    // Múltiples gimnasios
    return NextResponse.json({
        found: true,
        multiple: true,
        gyms: activos.map((a: any) => ({
            gimnasioId: (a.gimnasioId as any)._id.toString(),
            gimnasioNombre: (a.gimnasioId as any).nombre,
            gimnasioLogoUrl: (a.gimnasioId as any).logoHeaderUrl || (a.gimnasioId as any).logoUrl || null,
            nombre: a.nombre,
            apellido: a.apellido,
            hasPassword: pwdMap[a._id.toString()] ?? false,
        })),
    });
}
