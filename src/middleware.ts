import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = req.nextUrl;

    const publicPaths = ['/', '/login', '/soporte', '/privacidad', '/eliminar-cuenta', '/manifest.json', '/sw.js', '/firebase-messaging-sw.js', '/favicon.ico', '/apple-touch-icon.png'];
    const isPublic = publicPaths.includes(pathname) ||
        pathname.startsWith('/icons') ||
        pathname.startsWith('/login/');

    if (isPublic) return NextResponse.next();

    if (!token) {
        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = '/login';
        return NextResponse.redirect(loginUrl);
    }

    // Superadmin: solo /superadmin
    if (token.role === 'superadmin') {
        if (!pathname.startsWith('/superadmin')) {
            const url = req.nextUrl.clone();
            url.pathname = '/superadmin';
            return NextResponse.redirect(url);
        }
        return NextResponse.next();
    }

    // Alumno: solo /mi-cuenta
    if (token.role === 'alumno') {
        if (!pathname.startsWith('/mi-cuenta')) {
            const url = req.nextUrl.clone();
            url.pathname = '/mi-cuenta';
            return NextResponse.redirect(url);
        }
        return NextResponse.next();
    }

    // Registro: solo /alumnos/dni
    if (token.role === 'registro') {
        const allowedPaths = ['/alumnos/dni', '/logout'];
        if (!allowedPaths.includes(pathname)) {
            const url = req.nextUrl.clone();
            url.pathname = '/alumnos/dni';
            url.search = '';
            return NextResponse.redirect(url);
        }
    }

    // Gym staff no puede acceder a /superadmin ni /mi-cuenta
    if (pathname.startsWith('/superadmin') || pathname.startsWith('/mi-cuenta')) {
        const url = req.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|firebase-messaging-sw.js|icons|apple-touch-icon.png|api).*)',
    ],
};
