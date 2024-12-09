'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { useState } from 'react';
import { AiOutlineMenu, AiOutlineClose } from 'react-icons/ai'; // Iconos para el menú hamburguesa

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
    const { data: session } = useSession();
    const [menuOpen, setMenuOpen] = useState(false);

    const toggleMenu = () => setMenuOpen(!menuOpen);

    return (
        <>
            <nav className="bg-gray-800 p-6">
                <div className="flex items-center justify-between">
                    {/* <div className="text-white text-2xl">
                        <a href="/">Logo</a>
                    </div> */}
                    <button
                        onClick={toggleMenu}
                        className="text-white text-3xl md:hidden focus:outline-none"
                    >
                        {menuOpen ? <AiOutlineClose /> : <AiOutlineMenu />}
                    </button>
                </div>

                <ul
                    className={`${
                        menuOpen ? 'block' : 'hidden'
                    } md:flex md:space-x-6 mt-4 md:mt-0`}
                >
                    {session?.user?.role !== 'alumno' && (
                        <>
                            <li>
                                <a href="/" className="block text-white hover:underline py-2">
                                    Inicio
                                </a>
                            </li>
                            <li>
                                <a href="/alumnos" className="block text-white hover:underline py-2">
                                    Alumnos
                                </a>
                            </li>
                            <li>
                                <a href="/alumnos/nuevo" className="block text-white hover:underline py-2">
                                    Registrar Alumno
                                </a>
                            </li>
                        </>
                    )}
                    <li>
                        <a href="/alumnos/financias" className="block text-white hover:underline py-2">
                            Financias
                        </a>
                    </li>
                    <li>
                        <a href="/alumnos/dni" className="block text-white hover:underline py-2">
                            DNI
                        </a>
                    </li>
                </ul>
            </nav>

            <main className="p-6">{children}</main>
        </>
    );
}
