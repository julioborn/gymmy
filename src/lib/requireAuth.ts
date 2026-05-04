import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";

export async function requireAuth(): Promise<Response | null> {
    const session = await getServerSession(authOptions);
    if (!session) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    return null;
}
