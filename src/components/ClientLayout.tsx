'use client';

import { SessionProvider, useSession } from 'next-auth/react';

interface ClientLayoutProps {
    children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
    return (
        <SessionProvider>
            <LayoutWithSession>{children}</LayoutWithSession>
        </SessionProvider>
    );
}

function LayoutWithSession({ children }: ClientLayoutProps) {
    const { data: session, status } = useSession();

    // if (status === 'loading') {
    //     return <div>Cargando...</div>; // Mientras carga la sesión
    // }

    return (
        <>
            <nav className="bg-gray-800 p-8">
                <ul className="flex space-x-6">
                    {session?.user?.role !== 'alumno' && (
                        <>
                            <li>
                                <a href="/" className="text-white hover:underline">
                                    Inicio
                                </a>
                            </li>
                            <li>
                                <a href="/alumnos" className="text-white hover:underline">
                                    Alumnos
                                </a>
                            </li>
                            <li>
                                <a href="/alumnos/nuevo" className="text-white hover:underline">
                                    Registrar Alumno
                                </a>
                            </li>
                        </>
                    )}
                    <li>
                        <a href="/alumnos/dni" className="text-white hover:underline">
                            DNI
                        </a>
                    </li>
                </ul>
            </nav>
            <main className="p-6">{children}</main>
        </>
    );
}
