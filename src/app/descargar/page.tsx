import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
    title: 'Descargá Gymmy',
};

export default function DescargarPage() {
    return (
        <main className="min-h-screen bg-black flex flex-col items-center justify-center px-6 py-16">

            {/* Logo */}
            <div className="mb-12">
                <Image
                    src="/sporttime-logo.png"
                    alt="Sport Time"
                    width={140}
                    height={140}
                    className="rounded-3xl"
                    priority
                />
            </div>

            {/* Título */}

            {/* Botones */}
            <div className="w-full max-w-xs flex flex-col gap-4">

                {/* Android */}
                <Link
                    href="https://play.google.com/store/apps/details?id=com.julioborn.gymmy&pcampaignid=web_share"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 bg-black border-2 border-white text-white rounded-2xl px-5 py-4 active:scale-95 transition-all"
                >
                    <svg className="w-8 h-8 shrink-0" viewBox="0 0 24 24">
                        <path d="M3.18 23.76c.37.21.8.27 1.2.16L16.1 12.19l-3.72-3.69z" fill="#EA4335"/>
                        <path d="M22.04 10.56c-.42-.31-3.88-2.23-5.63-3.23l-3.43 3.17 3.73 3.69 5.33-1.69z" fill="#FBBC05"/>
                        <path d="M4.38.08C3.98-.03 3.55.03 3.18.27L14.1 11.19l3.73-3.7C14.71 5.66 4.38.08 4.38.08z" fill="#4285F4"/>
                        <path d="M3.18 23.73l10.92-10.92L3.18.27C2.76.52 2.5.97 2.5 1.5v21c0 .53.26.98.68 1.23z" fill="#34A853"/>
                    </svg>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-white/50 font-medium uppercase tracking-widest">Descargá en</span>
                        <span className="text-base font-bold leading-tight">Android</span>
                    </div>
                </Link>

                {/* iPhone */}
                <Link
                    href="https://apps.apple.com/ar/app/gymmy/id6771514690"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 bg-black border-2 border-white text-white rounded-2xl px-5 py-4 active:scale-95 transition-all"
                >
                    <svg className="w-8 h-8 shrink-0" viewBox="0 0 24 24" fill="white">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-white/50 font-medium uppercase tracking-widest">Descargá en</span>
                        <span className="text-base font-bold leading-tight">iPhone</span>
                    </div>
                </Link>

            </div>

        </main>
    );
}
