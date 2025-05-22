import nextPWA from 'next-pwa';

const withPWA = nextPWA({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development', // Asegura que funcione solo en producción
});

export default withPWA({
    // tus otras configuraciones aquí si tenés
});
