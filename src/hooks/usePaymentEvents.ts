import { useEffect, useRef } from 'react';

const POLL_MS = 15000;

export function usePaymentEvents(onPago: () => void) {
    const cbRef = useRef(onPago);
    cbRef.current = onPago;

    useEffect(() => {
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | null = null;
        let since = new Date(Date.now() - 10000).toISOString();

        const poll = async () => {
            if (cancelled) return;
            if (document.visibilityState === 'visible') {
                try {
                    const res = await fetch(`/api/pagos/mp/check?since=${encodeURIComponent(since)}`, { cache: 'no-store' });
                    if (res.ok) {
                        const { found, checkedAt } = await res.json();
                        if (checkedAt) since = checkedAt;
                        if (found) cbRef.current();
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
