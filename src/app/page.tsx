'use client';

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";

export default function HomePage() {
  const { data: session, status } = useSession();

  if (!session) {
    return (
      <div className="flex justify-center items-center mt-10">
        <div className="bg-white p-10 rounded-lg shadow-lg text-center max-w-lg w-full">
          <h1 className="text-4xl font-bold text-gray-800 mb-6">Bienvenido</h1>
          <p className="text-gray-600 mb-6">
            Inicia sesión para gestionar tus alumnos.
          </p>
          <button
            onClick={() => signIn()}
            className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition duration-300"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  function capitalizeFirstLetter(text: string) {
    if (!text) return ''; // Manejar caso de texto vacío o undefined
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  return (
    <div className="flex justify-center items-center mt-10">
      <div className="bg-white p-10 rounded-lg shadow-lg text-center max-w-lg w-full">
        <h1 className="text-4xl font-bold text-gray-800 mb-6">
          Bienvenido, {session.user?.username ? capitalizeFirstLetter(session.user.username) : "Usuario"}
        </h1>
        <p className="text-gray-600 mb-6">Selecciona una opción:</p>
        <div className="flex flex-col space-y-4 pb-4 border-b border-b-slate-300">
          <div className="flex flex-col space-y-4 justify-center items-center">
            <Link
              href="/alumnos"
              className="px-8 py-4 w-3/4 bg-green-600 text-white rounded-lg text-md font-semibold hover:bg-green-500 transition duration-300"
            >
              Lista de Alumnos
            </Link>
            <Link
              href="/alumnos/nuevo"
              className="px-8 py-4 w-3/4 bg-indigo-600 text-white rounded-lg text-md font-semibold hover:bg-indigo-500 transition duration-300"
            >
              Registrar Alumno
            </Link>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="mt-4 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-300"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}