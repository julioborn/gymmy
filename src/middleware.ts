import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = req.nextUrl;

    // Si no está autenticado, redirige al login
    if (!token) {
        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = '/login';
        return NextResponse.redirect(loginUrl);
    }

    // Si el usuario tiene rol "alumno"
    if (token.role === 'alumno') {
        const isAllowed = pathname === '/alumnos/dni';

        if (!isAllowed) {
            const redirectUrl = req.nextUrl.clone();
            redirectUrl.pathname = '/alumnos/dni';
            redirectUrl.search = ''; // Limpia los query params para evitar bucles
            return NextResponse.redirect(redirectUrl);
        }
    }

    // Si es profesor o dueño, permitir acceso normal
    return NextResponse.next();
}

// Aplicar middleware a todas las rutas excepto APIs y recursos estáticos
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|api).*)',
    ],
};
