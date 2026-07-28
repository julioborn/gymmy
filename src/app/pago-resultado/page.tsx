'use client';

import { useEffect, useState } from 'react';

export default function PagoResultadoPage() {
    const [status, setStatus] = useState<'ok' | 'error' | 'pendiente' | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const s = params.get('status') as 'ok' | 'error' | 'pendiente' | null;
        const paymentId = params.get('payment_id');
        const alumnoId = params.get('external_reference');
        setStatus(s);

        const alumnoIdFinal = alumnoId || sessionStorage.getItem('mp_alumno_id');
        if (s === 'ok' && paymentId && alumnoIdFinal) {
            sessionStorage.removeItem('mp_alumno_id');
            fetch(`/api/pagos/mp/verificar-publico?payment_id=${paymentId}&alumno_id=${alumnoIdFinal}`)
                .catch(() => {});
        }
    }, []);

    const isOk = status === 'ok';
    const isPendiente = status === 'pendiente';

    const cardColor = isOk
        ? 'bg-emerald-500'
        : isPendiente
        ? 'bg-amber-500'
        : 'bg-red-500';

    return (
        <div className="min-h-[calc(100vh-75px)] flex items-center justify-center px-6">
            <div className={`${cardColor} rounded-3xl px-8 py-10 flex flex-col items-center text-center max-w-xs w-full shadow-lg`}>

                {/* Ícono */}
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-5">
                    {isOk ? (
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                    ) : isPendiente ? (
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                    ) : (
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    )}
                </div>

                {/* Título */}
                <h1 className="text-white font-bold text-xl mb-2">
                    {isOk ? '¡Pago exitoso!' : isPendiente ? 'Pago en proceso' : 'Pago no completado'}
                </h1>

                {/* Descripción */}
                <p className="text-white/80 text-sm leading-relaxed">
                    {isOk
                        ? 'Tu cuota quedó registrada. Podés cerrar esta pestaña y volver a la app.'
                        : isPendiente
                        ? 'Tu pago está siendo procesado. Se registrará cuando se confirme.'
                        : 'El pago no se completó. Intentalo de nuevo desde la app.'}
                </p>

            </div>
        </div>
    );
}
