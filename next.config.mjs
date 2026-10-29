import nextPWA from "next-pwa";

const withPWA = nextPWA({
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development",
    additionalManifestEntries: [],
    customWorkerDir: 'worker',
    runtimeCaching: [
        // Datos del alumno — nunca cachear, siempre frescos
        {
            urlPattern: /^https?:\/\/.*\/api\/alumno\/me$/,
            handler: 'NetworkOnly',
        },
        // Streams SSE (asistencias/pagos en vivo) — nunca interceptar/cachear,
        // NetworkFirst corta/bufferiza la conexión persistente y rompe el realtime
        {
            urlPattern: /^https?:\/\/.*\/api\/(asistencias\/events|pagos\/mp\/events)$/,
            handler: 'NetworkOnly',
        },
        // Resto de APIs — NetworkFirst con fallback corto
        {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/auth/'),
            handler: 'NetworkFirst',
            options: {
                cacheName: 'apis',
                networkTimeoutSeconds: 10,
                expiration: { maxEntries: 16, maxAgeSeconds: 300 },
            },
        },
        // Assets estáticos de Next.js
        {
            urlPattern: /\/_next\/static\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'next-static', expiration: { maxEntries: 128, maxAgeSeconds: 86400 } },
        },
        // Imágenes
        {
            urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'images', expiration: { maxEntries: 64, maxAgeSeconds: 86400 } },
        },
        // Google Fonts
        {
            urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-webfonts', expiration: { maxEntries: 4, maxAgeSeconds: 31536000 } },
        },
        {
            urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets', expiration: { maxEntries: 4, maxAgeSeconds: 604800 } },
        },
        // Páginas
        {
            urlPattern: ({ url }) => !url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: { cacheName: 'pages', networkTimeoutSeconds: 10, expiration: { maxEntries: 32, maxAgeSeconds: 86400 } },
        },
    ],
});

const nextConfig = {
    reactStrictMode: true,
};

export default withPWA(nextConfig);
