import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = req.nextUrl;

    // ⚠️ Permitir libremente el acceso a /login y /api/*
    if (pathname.startsWith('/login') || pathname.startsWith('/api')) {
        return NextResponse.next();
    }

    // Si no está autenticado, redirigir a login
    if (!token) {
        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = '/login';
        loginUrl.search = ''; // evitar loops
        return NextResponse.redirect(loginUrl);
    }

    // Si es alumno, permitir solo /alumnos/dni y /logout
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

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
