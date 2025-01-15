// theme.ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        primary: {
            main: '#111827', // Tu color principal personalizado
            contrastText: '#FFFFFF', // Texto en componentes con fondo primario
        },
    },
});

export default theme;
