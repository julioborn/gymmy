const withPWA = require('next-pwa')({
    dest: 'public', // Carpeta donde se generarán los archivos de la PWA
    register: true,
    skipWaiting: true,
});

module.exports = withPWA({
    // Aquí puedes añadir otras configuraciones de Next.js
});
