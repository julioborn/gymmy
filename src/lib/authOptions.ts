import CredentialsProvider from "next-auth/providers/credentials";
import { MongoClient } from "mongodb";
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

type UserWithRole = {
    id: string;
    username: string;
    role: string;
};

export const authOptions: AuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
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
            }
            return session;
        },
        async jwt({ token, user }: { token: any; user?: UserWithRole }) {
            if (user) {
                token.id = user.id;
                token.username = user.username;
                token.role = user.role;
            }
            return token;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};
