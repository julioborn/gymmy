import nextPWA from 'next-pwa';

const withPWA = nextPWA({
    dest: 'public', // Carpeta donde se generarán los archivos de la PWA
    register: true,
    skipWaiting: true,
});

export default withPWA({
    // Aquí puedes añadir otras configuraciones de Next.js
});