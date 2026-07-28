'use client';

import { useEffect, useState } from 'react';

const APP_URL = 'https://www.gymmy.com.ar';

export default function PagoResultadoPage() {
    const [status, setStatus] = useState<'ok' | 'error' | 'pendiente' | null>(null);
    const [verified, setVerified] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const s = params.get('status') as 'ok' | 'error' | 'pendiente' | null;
        const paymentId = params.get('payment_id');
        const alumnoId = params.get('external_reference');
        setStatus(s);

        if (s === 'ok' && paymentId && alumnoId) {
            fetch(`/api/pagos/mp/verificar-publico?payment_id=${paymentId}&alumno_id=${alumnoId}`)
                .then(r => r.json())
                .then(data => { if (data.ok) setVerified(true); })
                .catch(() => {});
        }
    }, []);

    const isOk = status === 'ok';
    const isPendiente = status === 'pendiente';

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6 text-center">

            {/* Ícono */}
            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-6 ${
                isOk ? 'bg-emerald-500/20' : isPendiente ? 'bg-amber-500/20' : 'bg-red-500/20'
            }`}>
                {isOk ? (
                    <svg className="w-12 h-12 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                ) : isPendiente ? (
                    <svg className="w-12 h-12 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                ) : (
                    <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                )}
            </div>

            {/* Título */}
            <h1 className={`text-2xl font-bold mb-2 ${
                isOk ? 'text-emerald-400' : isPendiente ? 'text-amber-400' : 'text-red-400'
            }`}>
                {isOk ? '¡Pago exitoso!' : isPendiente ? 'Pago en proceso' : 'Pago no completado'}
            </h1>

            {/* Descripción */}
            <p className="text-slate-400 text-sm mb-8 max-w-xs leading-relaxed">
                {isOk
                    ? 'Tu cuota quedó registrada. Podés cerrar esta pestaña y volver a la app.'
                    : isPendiente
                    ? 'Tu pago está siendo procesado. Se registrará automáticamente cuando se confirme.'
                    : 'El pago no se completó. Podés intentarlo de nuevo desde la app.'}
            </p>

            {/* Botón volver */}
            <a
                href={APP_URL}
                className={`w-full max-w-xs flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white text-base transition-all ${
                    isOk ? 'bg-emerald-500 hover:bg-emerald-400' :
                    isPendiente ? 'bg-amber-500 hover:bg-amber-400' :
                    'bg-slate-600 hover:bg-slate-500'
                }`}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                </svg>
                Volver a Gymmy
            </a>

            <p className="text-slate-600 text-xs mt-4">
                O cerrá esta pestaña y abrí la app
            </p>
        </div>
    );
}
