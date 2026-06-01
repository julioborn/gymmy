'use client';

import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useFCM } from '@/hooks/useFCM';
import {
    Drawer, AppBar, Toolbar, IconButton, List, ListItem, ListItemButton,
    ListItemText, Divider, Box, CircularProgress, Typography,
    createTheme, CssBaseline, ThemeProvider,
} from '@mui/material';
import {
    Home as HomeIcon, People as PeopleIcon, PersonAdd as PersonAddIcon,
    MonetizationOn, BarChart as StatsIcon, ExitToApp as LogoutIcon,
    Menu as MenuIcon, Close as CloseIcon,
} from '@mui/icons-material';

interface ClientLayoutProps { children: React.ReactNode; }

const theme = createTheme({ palette: { primary: { main: '#111827' } } });

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

const menuItems = [
    { text: 'Inicio',            href: '/',                    icon: <HomeIcon /> },
    { text: 'Lista de Alumnos',  href: '/alumnos',             icon: <PeopleIcon /> },
    { text: 'Registrar Alumno',  href: '/alumnos/nuevo',       icon: <PersonAddIcon /> },
    { text: 'Finanzas',          href: '/alumnos/finanzas',    icon: <MonetizationOn /> },
    { text: 'Estadísticas',      href: '/alumnos/estadisticas',icon: <StatsIcon /> },
];

function LayoutWithSession({ children }: ClientLayoutProps) {
    const { data: session, status } = useSession();
    const [menuOpen, setMenuOpen] = useState(false);
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
        return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
    }, []);

    const toggleMenu = () => setMenuOpen((v) => !v);

    const menuLinks = (() => {
        const role = session?.user?.role;
        if (role === 'superadmin') return [];
        if (role === 'admin' || role === 'dueño') return menuItems;
        if (role === 'profesor') return menuItems.filter(
            (item) => item.href !== '/alumnos/finanzas' && item.href !== '/alumnos/estadisticas'
        );
        return [];
    })();

    if (!sessionReady) {
        return (
            <Box sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#0f172a',
            }}>
                <CircularProgress sx={{ color: '#10b981' }} />
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* AppBar */}
            <AppBar
                position="fixed"
                sx={{
                    zIndex: (t) => t.zIndex.drawer + 1,
                    backgroundColor: '#0f172a',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 1px 12px rgba(0,0,0,0.4)',
                }}
            >
                <Toolbar sx={{ height: 75, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {!pathname.startsWith('/login') && pathname !== '/soporte' && pathname !== '/privacidad' && pathname !== '/eliminar-cuenta' && (pathname !== '/' || !!session) ? (
                        <IconButton
                            edge="start"
                            onClick={toggleMenu}
                            sx={{
                                color: '#94a3b8',
                                '&:hover': { color: '#fff', backgroundColor: 'rgba(255,255,255,0.08)' },
                                transition: 'all 0.2s',
                            }}
                        >
                            {menuOpen ? <CloseIcon /> : <MenuIcon />}
                        </IconButton>
                    ) : (
                        <Box sx={{ width: 48 }} />
                    )}

                    <Box
                        component="img"
                        src="https://res.cloudinary.com/dwz4lcvya/image/upload/v1734807294/l-removebg-preview_1_ukxdkk.png"
                        alt="Logo"
                        sx={{
                            height: 270,
                            position: 'absolute',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            pointerEvents: 'none',
                        }}
                    />

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                            sx={{
                                width: 9,
                                height: 9,
                                borderRadius: '50%',
                                backgroundColor: isOnline ? '#10b981' : '#ef4444',
                                boxShadow: isOnline ? '0 0 8px #10b981' : '0 0 8px #ef4444',
                                transition: 'all 0.3s',
                            }}
                        />
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Offline overlay */}
            {!isOnline && pathname !== '/alumnos/dni' && (
                <Box sx={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
                    zIndex: 9999, display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', alignItems: 'center', color: 'white',
                }}>
                    <CircularProgress sx={{ color: '#10b981', mb: 2 }} />
                    <Typography variant="h6" fontWeight={600}>Reconectando...</Typography>
                </Box>
            )}

            {/* Back-online toast */}
            {backOnlineMessage && pathname !== '/alumnos/dni' && (
                <Box sx={{
                    position: 'fixed', top: 90, left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: '#10b981', color: 'white', px: 3, py: 1,
                    borderRadius: 3, zIndex: 1000, boxShadow: '0 4px 14px rgba(16,185,129,0.4)',
                }}>
                    <Typography variant="body2" fontWeight={700}>De vuelta en línea</Typography>
                </Box>
            )}

            {/* Drawer */}
            <Drawer
                anchor="left"
                open={menuOpen}
                onClose={toggleMenu}
                sx={{
                    '& .MuiDrawer-paper': {
                        width: 260,
                        mt: '75px',
                        boxSizing: 'border-box',
                        backgroundColor: '#0f172a',
                        borderRight: '1px solid rgba(255,255,255,0.06)',
                    },
                }}
            >
                <Box role="presentation" onClick={toggleMenu} onKeyDown={toggleMenu} sx={{ pt: 1.5 }}>
                    <List disablePadding>
                        {menuLinks.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton
                                        component="a"
                                        href={item.href}
                                        sx={{
                                            px: 2.5, py: 1.4, mx: 1, borderRadius: 2,
                                            backgroundColor: isActive ? 'rgba(16,185,129,0.12)' : 'transparent',
                                            color: isActive ? '#10b981' : '#94a3b8',
                                            borderLeft: isActive ? '3px solid #10b981' : '3px solid transparent',
                                            '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)', color: '#e2e8f0' },
                                            transition: 'all 0.15s',
                                            display: 'flex', alignItems: 'center', gap: 1.5,
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', fontSize: 20 }}>{item.icon}</Box>
                                        <ListItemText
                                            primary={item.text}
                                            primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem' }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            );
                        })}
                    </List>

                    <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.07)' }} />

                    <List disablePadding>
                        <ListItem disablePadding>
                            <ListItemButton
                                onClick={() => signOut()}
                                sx={{
                                    px: 2.5, py: 1.4, mx: 1, borderRadius: 2,
                                    color: '#f87171',
                                    borderLeft: '3px solid transparent',
                                    '&:hover': { backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' },
                                    transition: 'all 0.15s',
                                    display: 'flex', alignItems: 'center', gap: 1.5,
                                }}
                            >
                                <LogoutIcon fontSize="small" />
                                <ListItemText
                                    primary="Cerrar Sesión"
                                    primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem' }}
                                />
                            </ListItemButton>
                        </ListItem>
                    </List>
                </Box>
            </Drawer>

            {/* Content */}
            <Box component="main" sx={{ flexGrow: 1, p: 3, mt: '75px' }}>
                {children}
            </Box>
        </Box>
    );
}
