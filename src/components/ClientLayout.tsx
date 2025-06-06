'use client';

import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
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
    createTheme,
    CssBaseline,
    ThemeProvider,
} from '@mui/material';
import {
    Home as HomeIcon,
    People as PeopleIcon,
    PersonAdd as PersonAddIcon,
    MonetizationOn as FinanceIcon,
    BarChart as StatsIcon,
    ExitToApp as LogoutIcon,
    MonetizationOn,
} from '@mui/icons-material';

import { Menu as MenuIcon, Close as CloseIcon } from '@mui/icons-material';

interface ClientLayoutProps {
    children: React.ReactNode;
}

// Define el tema de Material-UI
const theme = createTheme({
    palette: {
        primary: {
            main: '#111827', // Tu color primario
        },
        secondary: {
            main: '#d32f2f', // Opcional: color secundario
        },
    },
});

export default function ClientLayout({ children }: ClientLayoutProps) {
    return (
        <SessionProvider>
            <ThemeProvider theme={theme}>
                <CssBaseline /> {/* Resetea el estilo base */}
                <LayoutWithSession>{children}</LayoutWithSession>
            </ThemeProvider>
        </SessionProvider>
    );
}

function LayoutWithSession({ children }: ClientLayoutProps) {
    const { data: session } = useSession();
    const [menuOpen, setMenuOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(true); // Estado de conexión
    const [reconnecting, setReconnecting] = useState(false); // Estado de reconexión
    const [backOnlineMessage, setBackOnlineMessage] = useState(false); // Mostrar mensaje "De vuelta en línea"
    const pathname = usePathname(); // Obtener la ruta actual

    const toggleMenu = () => setMenuOpen(!menuOpen);

    const menuItems = [
        { text: 'Inicio', href: '/' },
        { text: 'Lista de Alumnos', href: '/alumnos' },
        { text: 'Registrar Alumno', href: '/alumnos/nuevo' },
        { text: 'Finanzas', href: '/alumnos/finanzas' },
        { text: 'Estadísticas', href: '/alumnos/estadisticas' },
        // { text: 'DNI', href: '/alumnos/dni' },
    ];

    const menuLinks = (() => {
        console.log('Rol del usuario:', session?.user?.role); // Para depuración

        if (session?.user?.role === 'dueño') {
            return menuItems; // El dueño ve todas las rutas
        } else if (session?.user?.role === 'profesor') {
            return menuItems.filter(
                (item) => item.href !== '/alumnos/finanzas' && item.href !== '/alumnos/estadisticas'
            ); // El profesor no ve Finanzas ni Estadísticas
        } else if (session?.user?.role === 'registro') {
            return []; // Los alumnos no ven ninguna ruta, solo "Cerrar Sesión"
        }

        return []; // En caso de rol indefinido, no mostrar nada
    })();

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
                <Toolbar sx={{ height: 75, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Botón del menú */}
                    {pathname !== '/' && pathname !== '/login' ? (
                        <IconButton edge="start" color="inherit" aria-label="menu" onClick={toggleMenu} sx={{ mr: 2 }}>
                            {menuOpen ? <CloseIcon /> : <MenuIcon />}
                        </IconButton>
                    ) : (
                        <Box sx={{ width: 48 /* Espacio reservado para mantener alineación */ }} />
                    )}

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
                            pointerEvents: 'none', // Deshabilita la interacción del logo
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
            {!isOnline && pathname !== '/alumnos/dni' && (
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
            {backOnlineMessage && pathname !== '/alumnos/dni' && (
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
                        width: 260,
                        mt: 9,
                        boxSizing: 'border-box',
                        backgroundColor: '#f8fafc',
                        borderRight: '1px solid #e5e7eb',
                    },
                }}
            >
                <Box role="presentation" onClick={toggleMenu} onKeyDown={toggleMenu}>
                    <List>
                        {menuLinks.map((item) => {
                            const icon =
                                item.text === 'Inicio' ? <HomeIcon sx={{ mr: 1 }} /> :
                                    item.text === 'Lista de Alumnos' ? <PeopleIcon sx={{ mr: 1 }} /> :
                                        item.text === 'Registrar Alumno' ? <PersonAddIcon sx={{ mr: 1 }} /> :
                                            item.text === 'Finanzas' ? <MonetizationOn sx={{ mr: 1 }} /> :
                                                item.text === 'Estadísticas' ? <StatsIcon sx={{ mr: 1 }} /> :
                                                    null;

                            return (
                                <ListItem key={item.text} disablePadding>
                                    <ListItemButton
                                        component="a"
                                        href={item.href}
                                        sx={{
                                            px: 3,
                                            py: 1.5,
                                            mx: 1,
                                            borderRadius: 2,
                                            '&:hover': {
                                                backgroundColor: '#e2e8f0',
                                            },
                                        }}
                                    >
                                        {icon}
                                        <ListItemText
                                            primary={item.text}
                                            primaryTypographyProps={{ fontWeight: 600 }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            );
                        })}
                    </List>

                    <Divider sx={{ my: 1 }} />

                    {/* Cerrar sesión */}
                    <List>
                        <ListItem disablePadding>
                            <ListItemButton
                                onClick={() => signOut()}
                                sx={{
                                    px: 3,
                                    py: 1.5,
                                    mx: 1,
                                    borderRadius: 2,
                                    color: '#dc2626',
                                    '&:hover': {
                                        backgroundColor: '#fee2e2',
                                    },
                                }}
                            >
                                <LogoutIcon sx={{ mr: 1 }} />
                                <ListItemText
                                    primary="Cerrar Sesión"
                                    primaryTypographyProps={{ fontWeight: 600 }}
                                />
                            </ListItemButton>
                        </ListItem>
                    </List>
                </Box>
            </Drawer>

            {/* Main Content */}
            <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
                {children}
            </Box>
        </Box>
    );
}
