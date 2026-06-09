'use client';

import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useFCM } from '@/hooks/useFCM';
import { CircularProgress, createTheme, CssBaseline, ThemeProvider } from '@mui/material';

const theme = createTheme({ palette: { primary: { main: '#111827' } } });

interface ClientLayoutProps { children: React.ReactNode; }

export default function ClientLayout({ children }: ClientLayoutProps) {
    return (
        <SessionProvider>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <LayoutWithSession>{children}</LayoutWithSession>
            </ThemeProvider>
        </SessionProvider>
    );
}

function LayoutWithSession({ children }: ClientLayoutProps) {
    const { data: session, status } = useSession();
    useFCM();
    const [isOnline, setIsOnline] = useState(true);
    const [backOnlineMessage, setBackOnlineMessage] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        if (status !== 'loading') {
            setSessionReady(true);
            return;
        }
        const timer = setTimeout(() => setSessionReady(true), 8000);
        return () => clearTimeout(timer);
    }, [status]);

    useEffect(() => {
        const update = () => {
            if (navigator.onLine) {
                setIsOnline(true);
                setBackOnlineMessage(true);
                setTimeout(() => setBackOnlineMessage(false), 3000);
            } else {
                setIsOnline(false);
            }
        };
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        return () => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
        };
    }, []);

    const role = session?.user?.role;
    const isStaticPage = pathname === '/soporte' || pathname === '/privacidad' || pathname === '/eliminar-cuenta';
    const isLoginPage = pathname.startsWith('/login');
    const showNav = !isLoginPage && !isStaticPage && role !== 'superadmin' && role !== 'registro' && role !== 'alumno' && !!session;

    const navItems = (() => {
        if (!showNav) return [];
        const base = [
            {
                href: '/',
                label: 'Inicio',
                isActive: (p: string) => p === '/',
                icon: (
                    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                ),
            },
            {
                href: '/alumnos',
                label: 'Alumnos',
                isActive: (p: string) =>
                    p === '/alumnos' ||
                    (p.startsWith('/alumnos/') &&
                        !p.startsWith('/alumnos/nuevo') &&
                        !p.startsWith('/alumnos/finanzas') &&
                        !p.startsWith('/alumnos/estadisticas')),
                icon: (
                    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                    </svg>
                ),
            },
            {
                href: '/alumnos/nuevo',
                label: 'Registrar',
                isActive: (p: string) => p.startsWith('/alumnos/nuevo'),
                icon: (
                    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                    </svg>
                ),
            },
        ];

        if (role === 'dueño' || role === 'admin') {
            base.push({
                href: '/alumnos/finanzas',
                label: 'Finanzas',
                isActive: (p: string) => p.startsWith('/alumnos/finanzas'),
                icon: (
                    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                ),
            });
            base.push({
                href: '/alumnos/estadisticas',
                label: 'Estadísticas',
                isActive: (p: string) => p.startsWith('/alumnos/estadisticas'),
                icon: (
                    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                    </svg>
                ),
            });
        }

        return base;
    })();

    if (!sessionReady) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: '#0f172a' }}
            >
                <CircularProgress sx={{ color: '#10b981' }} />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen">
            {/* Top bar */}
            <header
                className="fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b border-white/[0.06] shadow-[0_1px_12px_rgba(0,0,0,0.4)]"
                style={{ paddingTop: 'env(safe-area-inset-top)' }}
            >
                <div className="relative h-[75px] flex items-center justify-between px-4">
                    {showNav ? (
                        <button
                            onClick={() => { if (confirm('¿Cerrar sesión?')) signOut(); }}
                            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors active:scale-90"
                            aria-label="Cerrar sesión"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
                            </svg>
                        </button>
                    ) : (
                        <div className="w-8" />
                    )}
                    <img
                        src="https://res.cloudinary.com/dwz4lcvya/image/upload/v1734807294/l-removebg-preview_1_ukxdkk.png"
                        alt="Logo"
                        className="pointer-events-none"
                        style={{ height: 270, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}
                    />
                    <div
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${isOnline
                            ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                            : 'bg-red-400 shadow-[0_0_8px_#ef4444]'
                            }`}
                    />
                </div>
            </header>

            {/* Offline overlay */}
            {!isOnline && pathname !== '/alumnos/dni' && (
                <div className="fixed inset-0 bg-black/85 z-[9999] flex flex-col justify-center items-center gap-4">
                    <CircularProgress sx={{ color: '#10b981' }} />
                    <p className="text-white text-lg font-semibold">Reconectando...</p>
                </div>
            )}

            {/* Back-online toast */}
            {backOnlineMessage && pathname !== '/alumnos/dni' && (
                <div className="fixed top-[90px] left-1/2 -translate-x-1/2 z-[1000] bg-emerald-500 text-white text-sm font-bold px-6 py-2 rounded-2xl shadow-[0_4px_14px_rgba(16,185,129,0.4)]">
                    De vuelta en línea
                </div>
            )}

            {/* Main content */}
            <main
                className="flex-1 p-3 mt-[75px]"
                style={{ paddingBottom: showNav ? 'calc(4rem + env(safe-area-inset-bottom, 0px))' : undefined }}
            >
                {children}
            </main>

            {/* Bottom navigation */}
            {showNav && navItems.length > 0 && (
                <nav
                    className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-white/[0.06]"
                    style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                >
                    <div className="flex items-stretch">
                        {navItems.map((item) => {
                            const active = item.isActive(pathname);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`relative flex-1 flex flex-col items-center justify-center pt-2.5 pb-2 gap-1 transition-colors ${active ? 'text-white' : 'text-slate-500 active:text-slate-300'}`}
                                >
                                    {active && (
                                        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-white rounded-full" />
                                    )}
                                    {item.icon}
                                    <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            )}
        </div>
    );
}
