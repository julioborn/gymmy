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

    // Si es alumno, redirigir a /alumnos/dni si intenta ir a otra página
    if (token.role === 'alumno' && pathname !== '/alumnos/dni') {
        const dniUrl = req.nextUrl.clone();
        dniUrl.pathname = '/alumnos/dni';
        return NextResponse.redirect(dniUrl);
    }

    // Si es profesor o cualquier otro rol, permitir acceso completo
    return NextResponse.next();
}

// Aplica el middleware a todas las rutas, excepto assets estáticos y APIs
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|api).*)',
    ],
};
