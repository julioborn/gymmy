"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [rememberMe, setRememberMe] = useState(false); // Estado para "Recuérdame"
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Autenticar al usuario
        const res = await signIn("credentials", {
            redirect: false, // Evitamos la redirección automática
            username,
            password,
        });

        if (res?.error) {
            setError("Usuario o contraseña incorrectos.");
            return;
        }

        try {
            // Obtener la sesión para verificar el rol del usuario
            const sessionResponse = await fetch("/api/auth/session");
            const session = await sessionResponse.json();

            if (session?.user?.role === "registro") {
                router.push("/alumnos/dni"); // Redirigir a la página de DNI si el rol es "alumno"
            } else {
                router.push("/"); // Redirigir al inicio si no es "alumno"
            }

            // Almacenar la preferencia de "Recuérdame" en localStorage
            if (rememberMe) {
                localStorage.setItem("rememberMe", "true");
            } else {
                localStorage.removeItem("rememberMe");
            }
        } catch (error) {
            console.error("Error al obtener la sesión:", error);
        }
    };

    return (
        <div className="flex flex-col items-center justify-start min-h-screen mt-4">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
                <h1 className="text-3xl font-semibold text-center text-gray-800 mb-6">Iniciar Sesión</h1>
                {error && (
                    <div className="text-red-500 text-center mb-4">
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-700">Usuario</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Ingresa tu usuario"
                            required
                            className="w-full p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Ingresa tu contraseña"
                            required
                            className="w-full p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                        />
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="mr-2"
                        />
                        <label className="text-gray-700">Recuérdame</label>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gray-700 text-white p-3 rounded-lg hover:bg-gray-600 transition duration-300"
                    >
                        Iniciar Sesión
                    </button>
                </form>
            </div>
        </div>
    );
}
