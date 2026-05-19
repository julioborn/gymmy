import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";

export interface AuthSession {
    user: {
        id: string;
        username: string;
        role: string;
        gimnasioId: string | null;
    };
}

type AuthSuccess = { ok: true; session: AuthSession };
type AuthFailure = { ok: false; error: Response };
export type AuthResult = AuthSuccess | AuthFailure;

function makeError(message: string, status: number): AuthFailure {
    return {
        ok: false,
        error: new Response(JSON.stringify({ error: message }), {
            status,
            headers: { 'Content-Type': 'application/json' },
        }),
    };
}

export async function requireAuth(): Promise<AuthResult> {
    const session = (await getServerSession(authOptions)) as AuthSession | null;
    if (!session) return makeError('No autorizado', 401);
    return { ok: true, session };
}

export async function requireGymAuth(): Promise<AuthResult> {
    const result = await requireAuth();
    if (!result.ok) return result;
    if (!result.session.user.gimnasioId) {
        return makeError('Sin gimnasio asociado', 403);
    }
    if (result.session.user.role === 'alumno') {
        return makeError('Acceso denegado', 403);
    }
    return result;
}

export async function requireAlumnoAuth(): Promise<AuthResult> {
    const result = await requireAuth();
    if (!result.ok) return result;
    if (result.session.user.role !== 'alumno') {
        return makeError('Acceso denegado', 403);
    }
    return result;
}

export async function requireSuperAdmin(): Promise<AuthResult> {
    const result = await requireAuth();
    if (!result.ok) return result;
    if (result.session.user.role !== 'superadmin') {
        return makeError('Acceso denegado', 403);
    }
    return result;
}
