'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import {
    Drawer,
    AppBar,
    Toolbar,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Divider,
    Box,
    CircularProgress,
    Typography,
} from '@mui/material';
import { Menu as MenuIcon, Close as CloseIcon } from '@mui/icons-material';

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
    const [isOnline, setIsOnline] = useState(true); // Estado de conexión
    const [reconnecting, setReconnecting] = useState(false); // Estado de reconexión
    const [backOnlineMessage, setBackOnlineMessage] = useState(false); // Mostrar mensaje "De vuelta en línea"

    const toggleMenu = () => setMenuOpen(!menuOpen);

    const menuItems = [
        { text: 'Inicio', href: '/' },
        { text: 'Lista de Alumnos', href: '/alumnos' },
        { text: 'Registrar Alumno', href: '/alumnos/nuevo' },
        { text: 'Finanzas', href: '/alumnos/finanzas' },
        { text: 'Planificación', href: '/alumnos/planificacion' },
        { text: 'DNI', href: '/alumnos/dni' },
    ];

    const menuLinks = session?.user?.role !== 'alumno' ? menuItems : menuItems.slice(-1);

    useEffect(() => {
        const updateOnlineStatus = () => {
            if (navigator.onLine) {
                setIsOnline(true);
                setReconnecting(false);
                setBackOnlineMessage(true);
                setTimeout(() => setBackOnlineMessage(false), 3000); // Mostrar mensaje por 3 segundos
            } else {
                setIsOnline(false);
                setReconnecting(true);
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        return () => {
            window.removeEventListener('online', updateOnlineStatus);
            window.removeEventListener('offline', updateOnlineStatus);
        };
    }, []);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {/* AppBar */}
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, backgroundColor: '#1f2937' }}>
                <Toolbar sx={{ height: 75, display: 'flex', justifyContent: 'space-between' }}>
                    {/* Botón del menú */}
                    <IconButton edge="start" color="inherit" aria-label="menu" onClick={toggleMenu} sx={{ mr: 2 }}>
                        {menuOpen ? <CloseIcon /> : <MenuIcon />}
                    </IconButton>

                    {/* Logo */}
                    <Box
                        component="img"
                        src="https://res.cloudinary.com/dwz4lcvya/image/upload/v1734807294/l-removebg-preview_1_ukxdkk.png"
                        alt="Logo"
                        sx={{
                            height: 270,
                            position: 'absolute',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontFamily: "'Hammersmith One', sans-serif",
                            color: '#fff',
                        }}
                    />

                    {/* Luz indicadora */}
                    <Box
                        sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: isOnline ? 'green' : 'red',
                            marginRight: 2,
                        }}
                    />
                </Toolbar>
            </AppBar>

            {/* Mensaje de reconexión */}
            {!isOnline && (
                <Box
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        zIndex: 9999,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: 'white',
                        flexDirection: 'column',
                    }}
                >
                    <CircularProgress sx={{ color: 'white', mb: 2 }} />
                    <Typography variant="h6">Reconectando...</Typography>
                </Box>
            )}

            {/* Mensaje "De vuelta en línea" */}
            {backOnlineMessage && (
                <Box
                    sx={{
                        position: 'fixed',
                        top: 20,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'green',
                        color: 'white',
                        px: 3,
                        py: 1,
                        borderRadius: 5,
                        zIndex: 1000,
                    }}
                >
                    <Typography variant="body1">De vuelta en línea</Typography>
                </Box>
            )}

            {/* Drawer */}
            <Drawer
                anchor="left"
                open={menuOpen}
                onClose={toggleMenu}
                sx={{
                    '& .MuiDrawer-paper': {
                        width: 240,
                        boxSizing: 'border-box',
                        mt: 9,
                        backgroundColor: '#dcdcdc',
                    },
                }}
            >
                <Box role="presentation" onClick={toggleMenu} onKeyDown={toggleMenu}>
                    <List>
                        {menuLinks.map((item) => (
                            <ListItem key={item.text} disablePadding>
                                <ListItemButton component="a" href={item.href}>
                                    <ListItemText primary={item.text} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                    <Divider />
                </Box>
            </Drawer>

            {/* Main Content */}
            <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
                {children}
            </Box>
        </Box>
    );
}