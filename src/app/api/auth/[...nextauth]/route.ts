import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

// Variables de entorno
const USE_ATLAS = process.env.USE_ATLAS === "true"; // Flag para decidir conexión
const ATLAS_URI = process.env.ATLAS_URI as string;
const MONGODB_URI = process.env.MONGODB_URI as string;
const MONGODB_DB = process.env.MONGODB_DB as string;

// Manejo de conexión con MongoDB
let clientPromise: Promise<MongoClient>;

if (!MONGODB_URI || !ATLAS_URI) {
    throw new Error("Por favor, define las variables de entorno MONGODB_URI y ATLAS_URI");
}

const client = new MongoClient(USE_ATLAS ? ATLAS_URI : MONGODB_URI);
clientPromise = client.connect();

// Tipo de usuario para las sesiones
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
            
                console.log("Iniciando sesión para el usuario:", credentials?.username);
            
                // Buscar usuario
                const user = await collection.findOne({ username: credentials?.username });
                console.log("Usuario encontrado:", user);
            
                if (!user) {
                    console.log("Usuario no encontrado");
                    throw new Error("Credenciales inválidas");
                }
            
                // Validar la contraseña usando bcrypt
                const isPasswordValid = await bcrypt.compare(credentials!.password, user.password);
                console.log("¿Contraseña válida?:", isPasswordValid);
            
                if (!isPasswordValid) {
                    console.log("Contraseña incorrecta");
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
        signIn: "/login", // Página de inicio de sesión personalizada
    },
    session: {
        strategy: "jwt", // Usar JWT para la sesión
        maxAge: 30 * 24 * 60 * 60, // Sesión válida por 30 días
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
    secret: process.env.NEXTAUTH_SECRET, // Secreto para encriptación de sesiones
};

export const POST = NextAuth(authOptions);
export const GET = NextAuth(authOptions);