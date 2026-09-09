import CredentialsProvider from "next-auth/providers/credentials";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongoClient";
import bcrypt from "bcryptjs";
import type { AuthOptions } from "next-auth";

async function getAuthDb() {
    const { db } = await getAuthDb();
    return db;
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

                const db = await getAuthDb();
                const user = await db.collection("usuarios").findOne({ username: credentials.username });

                if (!user) throw new Error("Credenciales inválidas");

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
                if (!isPasswordValid) throw new Error("Credenciales inválidas");

                let gimnasioNombre: string | null = null;
                let gimnasioLogoUrl: string | null = null;
                if (user.gimnasioId) {
                    const gym = await db.collection("gimnasios").findOne({ _id: user.gimnasioId });
                    gimnasioNombre = gym?.nombre || null;
                    gimnasioLogoUrl = gym?.logoUrl || null;
                }

                return {
                    id: user._id.toString(),
                    username: user.username,
                    role: user.role,
                    gimnasioId: user.gimnasioId?.toString() || null,
                    gimnasioNombre,
                    gimnasioLogoUrl,
                    nombre: user.nombre || null,
                    apellido: user.apellido || null,
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

                const db = await getAuthDb();
                const query: any = { dni: credentials.dni };
                if (credentials.gimnasioId) {
                    query.gimnasioId = new ObjectId(credentials.gimnasioId);
                }

                const alumno = await db.collection("alumnos").findOne(query);

                if (!alumno || !alumno.password) throw new Error("Credenciales inválidas");

                const isValid = await bcrypt.compare(credentials.password, alumno.password);
                if (!isValid) throw new Error("Credenciales inválidas");

                const gym = await db.collection("gimnasios").findOne({ _id: alumno.gimnasioId });

                return {
                    id: alumno._id.toString(),
                    username: alumno.dni,
                    role: "alumno",
                    gimnasioId: alumno.gimnasioId.toString(),
                    gimnasioNombre: gym?.nombre || null,
                    gimnasioLogoUrl: gym?.logoUrl || null,
                    nombre: alumno.nombre || null,
                    apellido: alumno.apellido || null,
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
                session.user.gimnasioNombre = (token.gimnasioNombre as string) || null;
                session.user.gimnasioLogoUrl = (token.gimnasioLogoUrl as string) || null;
                session.user.nombre = (token.nombre as string) || null;
                session.user.apellido = (token.apellido as string) || null;
            }
            return session;
        },
        async jwt({ token, user }: { token: any; user?: any }) {
            if (user) {
                token.id = user.id;
                token.username = user.username;
                token.role = user.role;
                token.gimnasioId = user.gimnasioId || null;
                token.gimnasioNombre = user.gimnasioNombre || null;
                token.gimnasioLogoUrl = user.gimnasioLogoUrl || null;
                token.nombre = user.nombre || null;
                token.apellido = user.apellido || null;
            }
            return token;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};
