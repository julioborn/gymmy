import CredentialsProvider from "next-auth/providers/credentials";
import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import type { AuthOptions } from "next-auth";

const USE_ATLAS = process.env.USE_ATLAS === "true";

let client: MongoClient | null = null;

async function getDb() {
    const uri = USE_ATLAS ? process.env.ATLAS_URI : process.env.MONGODB_URI;
    if (!uri) throw new Error("Falta URI de MongoDB en variables de entorno");
    if (!client) {
        client = new MongoClient(uri);
        await client.connect();
    }
    return client.db(process.env.MONGODB_DB);
}

export const authOptions: AuthOptions = {
    providers: [
        // ── Personal del gimnasio ──────────────────────────────────────
        CredentialsProvider({
            id: "staff-credentials",
            name: "Staff",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) {
                    throw new Error("Credenciales inválidas");
                }

                const db = await getDb();
                const user = await db.collection("usuarios").findOne({ username: credentials.username });

                if (!user) throw new Error("Credenciales inválidas");

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
                if (!isPasswordValid) throw new Error("Credenciales inválidas");

                return {
                    id: user._id.toString(),
                    username: user.username,
                    role: user.role,
                    gimnasioId: user.gimnasioId?.toString() || null,
                };
            },
        }),

        // ── Alumnos ────────────────────────────────────────────────────
        CredentialsProvider({
            id: "alumno-credentials",
            name: "Alumno",
            credentials: {
                dni: { label: "DNI", type: "text" },
                password: { label: "Password", type: "password" },
                gimnasioId: { label: "GimnasioId", type: "text" },
            },
            async authorize(credentials) {
                if (!credentials?.dni || !credentials?.password) {
                    throw new Error("Credenciales inválidas");
                }

                const db = await getDb();
                const query: any = { dni: credentials.dni };
                if (credentials.gimnasioId) {
                    query.gimnasioId = new ObjectId(credentials.gimnasioId);
                }

                const alumno = await db.collection("alumnos").findOne(query);

                if (!alumno || !alumno.password) throw new Error("Credenciales inválidas");

                const isValid = await bcrypt.compare(credentials.password, alumno.password);
                if (!isValid) throw new Error("Credenciales inválidas");

                return {
                    id: alumno._id.toString(),
                    username: `${alumno.nombre} ${alumno.apellido}`,
                    role: "alumno",
                    gimnasioId: alumno.gimnasioId.toString(),
                };
            },
        }),
    ],
    pages: { signIn: "/login" },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60,
    },
    callbacks: {
        async session({ session, token }: { session: any; token: any }) {
            if (token) {
                session.user.id = token.id as string;
                session.user.username = token.username as string;
                session.user.role = token.role as string;
                session.user.gimnasioId = (token.gimnasioId as string) || null;
            }
            return session;
        },
        async jwt({ token, user }: { token: any; user?: any }) {
            if (user) {
                token.id = user.id;
                token.username = user.username;
                token.role = user.role;
                token.gimnasioId = user.gimnasioId || null;
            }
            return token;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};
