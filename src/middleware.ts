import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = req.nextUrl;

    // Si el usuario no está autenticado
    if (!token) {
        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = '/login';
        return NextResponse.redirect(loginUrl);
    }

    // Verificar si el usuario es 'alumno'
    if (token.role === 'alumno') {
        // Permitir solo la ruta /alumnos/dni
        if (pathname !== '/alumnos/dni') {
            const dniUrl = req.nextUrl.clone();
            dniUrl.pathname = '/alumnos/dni';
            return NextResponse.redirect(dniUrl);
        }
    }

    // Si es 'profesor', permitir acceso a todas las rutas
    return NextResponse.next();
}

// Proteger todas las rutas bajo /alumnos/*
export const config = {
    matcher: ['/alumnos/:path*'],
};