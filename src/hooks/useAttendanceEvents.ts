import { useEffect, useRef } from 'react';

const POLL_MS = 15000;

export function useAttendanceEvents(onRefresh: () => void) {
    const cbRef = useRef(onRefresh);
    cbRef.current = onRefresh;

    useEffect(() => {
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | null = null;
        let lastSignature: string | null = null;

        const poll = async () => {
            if (cancelled) return;
            // Mientras la pestaña está oculta no tiene sentido pegarle al server;
            // visibilitychange dispara un poll inmediato apenas vuelve a primer plano.
            if (document.visibilityState === 'visible') {
                try {
                    const res = await fetch('/api/asistencias/signature', { cache: 'no-store' });
                    if (res.ok) {
                        const { signature } = await res.json();
                        if (lastSignature !== null && signature !== lastSignature) {
                            cbRef.current();
                        }
                        lastSignature = signature;
                    }
                } catch { /* red caída, reintenta en el próximo ciclo */ }
            }
            if (!cancelled) timer = setTimeout(poll, POLL_MS);
        };

        const onVisible = () => {
            if (document.visibilityState === 'visible' && timer) {
                clearTimeout(timer);
                poll();
            }
        };

        poll();
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);
}
