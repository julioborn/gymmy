import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = req.nextUrl;

    // Permitir cargar la raíz (/) sin redirección
    if (pathname === '/') {
        return NextResponse.next();
    }

    // Si no está autenticado, redirigir a /login
    if (!token) {
        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = '/login';
        return NextResponse.redirect(loginUrl);
    }

    // Si es alumno, permitir solo ciertas rutas
    if (token.role === 'alumno') {
        const allowedPaths = ['/alumnos/dni', '/logout'];

        if (!allowedPaths.includes(pathname)) {
            const redirectUrl = req.nextUrl.clone();
            redirectUrl.pathname = '/alumnos/dni';
            redirectUrl.search = '';
            return NextResponse.redirect(redirectUrl);
        }
    }

    return NextResponse.next();
}
