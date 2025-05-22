import nextPWA from 'next-pwa';

const withPWA = nextPWA({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development', 
});

export default withPWA({
    // Aquí puedes añadir otras configuraciones de Next.js
});
