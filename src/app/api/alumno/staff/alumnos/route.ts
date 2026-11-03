import { NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Alumno from '@/models/Alumno';
import { requireAlumnoAuth } from '@/lib/requireAuth';
import { esStaffAlumno } from '@/lib/staffAlumnos';
import { notifyOwners } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

async function checkStaffAlumno(alumnoId: string) {
    const yo = await Alumno.findById(alumnoId).select('dni gimnasioId');
    if (!yo || !esStaffAlumno(yo.dni)) return null;
    return yo;
}

export async function GET() {
    const auth = await requireAlumnoAuth();
    if (!auth.ok) return auth.error;

    await connectMongoDB();
    const yo = await checkStaffAlumno(auth.session.user.id);
    if (!yo) {
        return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    const alumnos = await Alumno.find(
        { gimnasioId: yo.gimnasioId },
        { nombre: 1, apellido: 1, dni: 1, telefono: 1, exentoCuota: 1, asistencia: 1, pagos: 1 },
    ).sort({ apellido: 1 }).lean();

    return NextResponse.json({ ok: true, alumnos });
}

export async function POST(request: Request) {
    const auth = await requireAlumnoAuth();
    if (!auth.ok) return auth.error;

    await connectMongoDB();
    const yo = await checkStaffAlumno(auth.session.user.id);
    if (!yo) {
        return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    const {
        nombre, apellido, fechaNacimiento, dni, telefono, email,
        diasEntrenaSemana, fechaInicio, horarioEntrenamiento,
        area, nivelExperiencia, patologias,
    } = await request.json();

    if (!nombre || !apellido || !dni || !fechaNacimiento) {
        return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
    }

    try {
        const nuevoAlumno = new Alumno({
            nombre,
            apellido,
            fechaNacimiento,
            dni,
            telefono,
            email,
            diasEntrenaSemana: diasEntrenaSemana || null,
            fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
            horarioEntrenamiento: horarioEntrenamiento || null,
            historialDeportivo: '',
            historialDeVida: '',
            objetivos: '',
            patologias: patologias || '',
            area: area || null,
            nivelExperiencia: nivelExperiencia || null,
            exentoCuota: false,
            asistencia: [],
            pagos: [],
            planEntrenamiento: { fechaInicio: null, duracion: null, diasRestantes: null, terminado: false },
            gimnasioId: yo.gimnasioId,
        });

        await nuevoAlumno.save();

        notifyOwners(yo.gimnasioId?.toString() ?? '', {
            title: '👤 Nuevo alumno registrado',
            body: `${nombre} ${apellido} se registró en el gimnasio.`,
            url: '/',
        }).catch(() => {});

        return NextResponse.json(nuevoAlumno, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Error creando alumno' }, { status: 500 });
    }
}
