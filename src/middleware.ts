import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = req.nextUrl;

    // Permitir acceso sin token a /, /login, /manifest.json, /sw.js y archivos de íconos
    const publicPaths = ['/', '/login', '/manifest.json', '/sw.js', '/favicon.ico', '/apple-touch-icon.png'];
    const isPublic = publicPaths.includes(pathname) || pathname.startsWith('/icons');

    if (isPublic) {
        return NextResponse.next();
    }

    // Redirigir a login si no hay token
    if (!token) {
        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = '/login';
        return NextResponse.redirect(loginUrl);
    }

    // Si es alumno, restringir solo a /alumnos/dni y /logout
    if (token.role === 'registro') {
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
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|apple-touch-icon.png|api).*)',
    ],
};
