import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'SportTime — Eliminar cuenta',
    description: 'Eliminá tu cuenta de SportTime y todos tus datos personales.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
