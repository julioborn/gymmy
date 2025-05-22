import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = req.nextUrl;

    // Permitir libre acceso a la raíz solo para la instalación de la PWA
    if (pathname === '/' && req.method === 'GET') {
        return NextResponse.next();
    }

    // Si no está autenticado, redirigir a login
    if (!token) {
        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = '/login';
        return NextResponse.redirect(loginUrl);
    }

    // Si es alumno, limitar a rutas específicas
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
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|apple-touch-icon.png).*)',
    ],
};
