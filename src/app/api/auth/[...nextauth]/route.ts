import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI as string;
const MONGODB_DB = process.env.MONGODB_DB as string;

let clientPromise: Promise<MongoClient>;

if (!MONGODB_URI) {
    throw new Error("Por favor, define la variable de entorno MONGODB_URI");
}

const client = new MongoClient(MONGODB_URI);
clientPromise = client.connect();

// Define el tipo de usuario para añadir los roles
type UserWithRole = {
    id: string;
    username: string;
    role: string;
};

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const db = (await clientPromise).db(MONGODB_DB);
                const collection = db.collection("usuarios");

                const user = await collection.findOne({ username: credentials?.username });

                if (!user) {
                    throw new Error("Credenciales inválidas");
                }

                const isPasswordValid = await bcrypt.compare(credentials!.password, user.password);

                if (!isPasswordValid) {
                    throw new Error("Credenciales inválidas");
                }

                return {
                    id: user._id.toString(),
                    username: user.username,
                    role: user.role,
                };
            }
        }),
    ],
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt", // Usar JWT para mantener la sesión
        maxAge: 30 * 24 * 60 * 60, // Extiende la duración de la sesión a 30 días si el usuario marca "Recuérdame"
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

export const POST = NextAuth(authOptions);
export const GET = NextAuth(authOptions);