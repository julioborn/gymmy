import nextPWA from "next-pwa";

const withPWA = nextPWA({
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development",
    // Inyecta el handler de Firebase en el SW generado por next-pwa
    additionalManifestEntries: [],
    customWorkerDir: 'worker',
});

const nextConfig = {
    reactStrictMode: true,
    experimental: {
        instrumentationHook: true,
    },
};

export default withPWA(nextConfig);
