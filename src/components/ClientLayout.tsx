'use client';

import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFCM } from '@/hooks/useFCM';
import { CircularProgress, createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import Swal from 'sweetalert2';
import { swalDanger } from '@/utils/swalConfig';

const theme = createTheme({ palette: { primary: { main: '#111827' } } });

interface ClientLayoutProps { children: React.ReactNode; }

interface GymTema {
    nombre: string;
    logoUrl: string | null;
    temaFondo: string | null;
    temaAcento: string | null;
    temaAcento2: string | null;
}

const PULL_THRESHOLD = 72;
const SWIPE_THRESHOLD = 80;
const EDGE_ZONE = 28;

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
    const router = useRouter();
    useFCM();

    const [isOnline, setIsOnline] = useState(true);
    const [backOnlineMessage, setBackOnlineMessage] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const pathname = usePathname();

    // ── Pull-to-refresh state ──
    const [pullY, setPullY] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // ── Swipe-back state ──
    const [swipeX, setSwipeX] = useState(0);
    const [isSwipingBack, setIsSwipingBack] = useState(false);

    // ── Gesture ref (shared mutable state for event closures) ──
    const g = useRef({
        startX: 0, startY: 0,
        pullY: 0, swipeX: 0,
        type: null as 'pull' | 'swipe' | null,
        busy: false,
    });


    // Reset gestures on route change
    useEffect(() => {
        g.current.type = null;
        g.current.pullY = 0;
        g.current.swipeX = 0;
        g.current.busy = false;
        setPullY(0);
        setSwipeX(0);
        setIsSwipingBack(false);
        setIsRefreshing(false);
    }, [pathname]);

    useEffect(() => {
        if (status === 'loading') {
            const t = setTimeout(() => setSessionReady(true), 8000);
            return () => clearTimeout(t);
        }
        setSessionReady(true);
    }, [status]);

    // Centralised auth guard — only fires once session is definitively known
    useEffect(() => {
        if (!sessionReady || status === 'loading') return;
        if (status !== 'unauthenticated') return;
        const publicPaths = ['/login', '/registro', '/soporte', '/privacidad', '/eliminar-cuenta'];
        const isPublic = publicPaths.some(p => pathname.startsWith(p));
        if (isPublic) return;
        // Small grace period to avoid transient unauthenticated flashes on reload
        const t = setTimeout(() => router.push('/login'), 500);
        return () => clearTimeout(t);
    }, [sessionReady, status, pathname, router]);

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
        return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
    }, []);

    // ── Global touch gesture handlers ──
    useEffect(() => {
        const canSwipeBack = () => pathname !== '/' && !pathname.startsWith('/login');

        function onStart(e: TouchEvent) {
            const t = e.touches[0];
            g.current.startX = t.clientX;
            g.current.startY = t.clientY;
            g.current.type = null;
        }

        function onMove(e: TouchEvent) {
            if (g.current.busy) return;
            const t = e.touches[0];
            const dx = t.clientX - g.current.startX;
            const dy = t.clientY - g.current.startY;

            if (!g.current.type) {
                const ax = Math.abs(dx), ay = Math.abs(dy);
                if (ax < 4 && ay < 4) return;

                if (canSwipeBack() && g.current.startX <= EDGE_ZONE && dx > 0 && ax > ay * 1.2) {
                    g.current.type = 'swipe';
                } else if (dy > 0 && ay > ax * 1.2 && window.scrollY <= 0) {
                    g.current.type = 'pull';
                } else {
                    g.current.type = null;
                    return;
                }
            }

            if (g.current.type === 'pull') {
                const pulled = Math.min(dy * 0.48, PULL_THRESHOLD + 32);
                g.current.pullY = pulled;
                setPullY(pulled);
            } else if (g.current.type === 'swipe') {
                const clamped = Math.min(dx, window.innerWidth * 0.5);
                g.current.swipeX = clamped;
                setSwipeX(clamped);
                setIsSwipingBack(true);
            }
        }

        function onEnd() {
            const { type } = g.current;

            if (type === 'pull') {
                if (g.current.pullY >= PULL_THRESHOLD) {
                    g.current.busy = true;
                    setIsRefreshing(true);
                    setPullY(PULL_THRESHOLD);
                    router.refresh();
                    window.dispatchEvent(new CustomEvent('gymmy:refresh'));
                    setTimeout(() => {
                        g.current.busy = false;
                        setIsRefreshing(false);
                        setPullY(0);
                        g.current.pullY = 0;
                    }, 1300);
                } else {
                    setPullY(0);
                    g.current.pullY = 0;
                }
            } else if (type === 'swipe') {
                if (g.current.swipeX >= SWIPE_THRESHOLD) {
                    // Animate slide-out then navigate
                    setSwipeX(window.innerWidth * 0.5);
                    setTimeout(() => {
                        router.back();
                        setSwipeX(0);
                        setIsSwipingBack(false);
                        g.current.swipeX = 0;
                    }, 180);
                } else {
                    setSwipeX(0);
                    setIsSwipingBack(false);
                    g.current.swipeX = 0;
                }
            }

            g.current.type = null;
        }

        document.addEventListener('touchstart', onStart, { passive: true });
        document.addEventListener('touchmove', onMove, { passive: true });
        document.addEventListener('touchend', onEnd, { passive: true });
        return () => {
            document.removeEventListener('touchstart', onStart);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
        };
    }, [pathname, router]);

    const [gymTema, setGymTema] = useState<GymTema | null>(null);

    // Logo flip animation
    const [logoShown, setLogoShown]       = useState<string | null>(null);
    const [logoAnimating, setLogoAnimating] = useState(false);

    useEffect(() => {
        if (!sessionReady || !session?.user?.gimnasioId) return;
        fetch('/api/gimnasio/tema')
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setGymTema(data); })
            .catch(() => {});
    }, [sessionReady, session?.user?.gimnasioId]);

    const navBg   = gymTema?.temaFondo  ?? '#0a0a0a';
    const acento  = gymTema?.temaAcento ?? '#10b981';
    const acento2 = gymTema?.temaAcento2 ?? null;
    const gymLogo = gymTema?.logoUrl    ?? null;

    // Trigger flip when gym logo arrives or changes
    useEffect(() => {
        if (gymLogo === logoShown) return;
        setLogoAnimating(true);
        const t = setTimeout(() => {
            setLogoShown(gymLogo);
            setLogoAnimating(false);
        }, 200);
        return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gymLogo]);

    const role = session?.user?.role;
    const isStaticPage = pathname === '/soporte' || pathname === '/privacidad' || pathname === '/eliminar-cuenta';
    const isLoginPage = pathname.startsWith('/login');
    const isRegistroPage = pathname.startsWith('/registro/');
    const showNav = !isLoginPage && !isStaticPage && !isRegistroPage && role !== 'superadmin' && role !== 'registro' && role !== 'alumno' && !!session;
    const showMenu = !isLoginPage && !isStaticPage && !!session;

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
                        !p.startsWith('/alumnos/finanzas') &&
                        !p.startsWith('/alumnos/estadisticas')),
                icon: (
                    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                    </svg>
                ),
            },
        ];

        base.push({
            href: '/plantillas',
            label: 'Planes',
            isActive: (p: string) => p.startsWith('/plantillas'),
            icon: (
                <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
                </svg>
            ),
        });

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

    const pullProgress = Math.min(pullY / PULL_THRESHOLD, 1);
    const indicatorH = isRefreshing ? 48 : Math.round(pullProgress * 48);

    if (!sessionReady) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
                <CircularProgress sx={{ color: '#10b981' }} />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen" style={{ overscrollBehavior: 'none' }}>

            {/* ── HEADER ── */}
            <header
                className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] shadow-[0_1px_12px_rgba(0,0,0,0.4)]"
                style={{ background: navBg, paddingTop: 'env(safe-area-inset-top)', display: isRegistroPage ? 'none' : undefined }}
            >
                <div className="relative h-[75px] flex items-center justify-between px-4">
                    {showMenu ? (
                        <button
                            onClick={async () => {
                                const first = await Swal.fire({
                                    ...swalDanger,
                                    title: 'Cerrar sesión',
                                    text: '¿Querés salir de tu cuenta?',
                                    icon: 'question',
                                    showCancelButton: true,
                                    confirmButtonText: 'Salir',
                                    cancelButtonText: 'Cancelar',
                                });
                                if (!first.isConfirmed) return;
                                const second = await Swal.fire({
                                    ...swalDanger,
                                    title: '¿Seguro?',
                                    text: 'Se cerrará la sesión en este dispositivo.',
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonText: 'Sí, cerrar',
                                    cancelButtonText: 'Cancelar',
                                });
                                if (second.isConfirmed) signOut();
                            }}
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors active:scale-90"
                            aria-label="Cerrar sesión"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
                            </svg>
                        </button>
                    ) : (
                        <div className="w-8" />
                    )}

                    <Link href="/" className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
                        style={{ perspective: '600px' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={logoShown
                                ? logoShown
                                : 'https://res.cloudinary.com/dwz4lcvya/image/upload/v1785379248/gymmynobg_e7mszc.png'}
                            alt={logoShown ? (gymTema?.nombre ?? 'Gimnasio') : 'Gymmy'}
                            style={{
                                maxHeight: logoShown ? 68 : 38,
                                maxWidth: logoShown ? 220 : 120,
                                objectFit: 'contain',
                                transform: logoAnimating ? 'scaleX(0)' : 'scaleX(1)',
                                opacity: logoAnimating ? 0 : 1,
                                transition: logoAnimating
                                    ? 'transform 0.18s ease-in, opacity 0.15s ease-in'
                                    : 'transform 0.24s ease-out, opacity 0.22s ease-out, max-height 0.22s ease',
                            }}
                        />
                    </Link>

                    <div className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                        style={isOnline
                            ? { background: acento2 ?? acento, boxShadow: `0 0 8px ${acento2 ?? acento}` }
                            : { background: '#f87171', boxShadow: '0 0 8px #ef4444' }
                        } />
                </div>
            </header>

            {/* ── PULL-TO-REFRESH INDICATOR ── */}
            {(pullY > 4 || isRefreshing) && (
                <div
                    className="fixed left-1/2 -translate-x-1/2 z-[45] pointer-events-none"
                    style={{
                        top: `calc(75px + env(safe-area-inset-top, 0px) + 10px)`,
                        opacity: isRefreshing ? 1 : pullProgress,
                        transform: `translateX(-50%) translateY(${isRefreshing ? 0 : (pullProgress - 1) * 16}px)`,
                        transition: isRefreshing ? 'opacity 0.15s ease' : undefined,
                    }}
                >
                    <div
                        className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg"
                        style={{ background: navBg, border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                        <div
                            className={`w-4 h-4 rounded-full border-2 ${isRefreshing ? 'animate-spin' : ''}`}
                            style={{
                                borderColor: 'rgba(255,255,255,0.2)',
                                borderTopColor: acento2 ?? acento,
                                transform: isRefreshing ? undefined : `rotate(${pullProgress * 270}deg)`,
                                transition: isRefreshing ? undefined : 'transform 0.07s linear',
                            }}
                        />
                    </div>
                </div>
            )}

            {/* ── SWIPE-BACK INDICATOR ── */}
            {isSwipingBack && swipeX > 6 && (
                <div
                    className="fixed left-0 top-1/2 -translate-y-1/2 z-[45] pointer-events-none"
                    style={{ opacity: Math.min(swipeX / (SWIPE_THRESHOLD * 0.75), 1) }}
                >
                    <div
                        className="bg-slate-800/85 backdrop-blur-sm rounded-r-2xl pl-2 pr-3 py-4 shadow-xl"
                        style={{ transform: `translateX(${Math.max((swipeX / SWIPE_THRESHOLD - 0.2) * 18, 0)}px)` }}
                    >
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                        </svg>
                    </div>
                </div>
            )}

            {/* ── OFFLINE OVERLAY ── */}
            {!isOnline && pathname !== '/alumnos/dni' && (
                <div className="fixed inset-0 bg-black/85 z-[9999] flex flex-col justify-center items-center gap-4">
                    <CircularProgress sx={{ color: '#10b981' }} />
                    <p className="text-white text-lg font-semibold">Reconectando...</p>
                </div>
            )}

            {/* ── BACK-ONLINE TOAST ── */}
            {backOnlineMessage && pathname !== '/alumnos/dni' && (
                <div className="fixed top-[90px] left-1/2 -translate-x-1/2 z-[1000] text-white text-sm font-bold px-6 py-2 rounded-2xl"
                    style={{ background: acento2 ?? acento, boxShadow: `0 4px 14px ${(acento2 ?? acento)}66` }}>
                    De vuelta en línea
                </div>
            )}

            {/* ── MAIN CONTENT ── */}
            <main
                className="flex-1 p-3 bg-slate-50"
                style={{
                    marginTop: isRegistroPage ? 0 : 'calc(75px + env(safe-area-inset-top, 0px))',
                    paddingBottom: (showNav && !isRegistroPage) ? 'calc(4rem + env(safe-area-inset-bottom, 0px))' : undefined,
                    transform: swipeX > 0 ? `translateX(${swipeX * 0.12}px)` : undefined,
                    transition: swipeX === 0 ? 'transform 0.22s ease' : undefined,
                    willChange: swipeX > 0 ? 'transform' : undefined,
                }}
            >
                {children}
            </main>

            {/* ── BOTTOM NAV ── */}
            {showNav && navItems.length > 0 && (
                <nav
                    className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.06]"
                    style={{ background: navBg, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
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
                                        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full"
                                            style={{ background: acento }} />
                                    )}
                                    {item.icon}
                                    <span className="text-[10px] font-semibold tracking-wide"
                                        style={active ? { color: acento } : undefined}>
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            )}
        </div>
    );
}
