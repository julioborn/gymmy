'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { useState } from 'react';
import {
    Drawer,
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Divider,
    Box,
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

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

            {/* AppBar */}
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, backgroundColor: '#1f2937' }}>
                <Toolbar sx={{ height: 75, display: 'flex', justifyContent: 'space-between' }}>
                    {/* Botón del menú */}
                    <IconButton
                        edge="start"
                        color="inherit"
                        aria-label="menu"
                        onClick={toggleMenu}
                        sx={{ mr: 2 }}
                    >
                        {menuOpen ? <CloseIcon /> : <MenuIcon />}
                    </IconButton>

                    {/* Título centrado */}
                    {/* <Typography
                        variant="h3"
                        component="div"
                        sx={{
                            position: 'absolute', // Absoluto para centrar en el AppBar
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontFamily: "'Hammersmith One', sans-serif",
                            color: '#fff',
                        }}
                    >
                        Gymmy
                    </Typography> */}
                    <Box
                        component="img"
                        src="https://res.cloudinary.com/dwz4lcvya/image/upload/v1734807294/l-removebg-preview_1_ukxdkk.png"
                        alt="Logo"
                        sx={{
                            height: 270,
                            position: 'absolute', // Absoluto para centrar en el AppBar
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontFamily: "'Hammersmith One', sans-serif",
                            color: '#fff',
                        }}
                    />
                </Toolbar>
            </AppBar>

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
                        backgroundColor: '#dcdcdc', // Fondo personalizado
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
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    mt: 8, // Ajuste para compensar el AppBar
                }}
            >
                {children}
            </Box>
        </Box>
    );
}
