import nextPWA from "next-pwa";

const withPWA = nextPWA({
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development", // 🔹 Desactiva PWA en desarrollo
});

const nextConfig = {
    reactStrictMode: true,
};

export default withPWA(nextConfig);
