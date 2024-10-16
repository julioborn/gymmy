'use client';

import { useSession, signIn, signOut } from "next-auth/react";

export default function HomePage() {
  const { data: session, status } = useSession();

  // if (status === "loading") {
  //   return (
  //     <div className="flex justify-center items-center h-screen">
  //       <div className="text-gray-600">Cargando...</div>
  //     </div>
  //   );
  // }

  if (!session) {
    return (
      <div className="flex justify-center items-start h-screen">
        <div className="bg-white p-8 rounded-md shadow-md text-center max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4">Bienvenido a Gymmy</h1>
          <p className="text-gray-600 mb-4">La sesión no está activa</p>
          <button
            onClick={() => signIn()}
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition duration-300"
          >
            Iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-start h-screen">
      <div className="bg-white p-8 rounded-md shadow-md text-center max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Hola, {session.user?.username}</h1>
        <p className="text-gray-600 mb-4 ">La sesión está activa</p>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
