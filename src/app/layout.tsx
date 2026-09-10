import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import ClientLayout from "@/components/ClientLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: "Gymmy",
  description: "Sistema de gestión de gimnasio",
  manifest: "/api/pwa/manifest",
  themeColor: "#111827",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gymmy",
  },
  icons: {
    icon: "/icons/favicon.ico",
    apple: "/api/pwa/icon",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
<body className="bg-slate-50 min-h-screen overscroll-none">
        <ErrorBoundary>
          <ClientLayout>{children}</ClientLayout>
        </ErrorBoundary>
      </body>
    </html>
  );
}
