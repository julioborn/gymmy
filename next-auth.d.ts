import NextAuth from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string; // Añadimos la propiedad 'id'
            username: string;
            role: string;
        } & DefaultSession["user"];
    }

    interface User {
        id: string;
        username: string;
        role: string;
    }
}
