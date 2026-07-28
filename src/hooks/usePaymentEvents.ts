import { useEffect, useRef } from 'react';

export function usePaymentEvents(onPago: () => void) {
    const cbRef = useRef(onPago);
    cbRef.current = onPago;

    useEffect(() => {
        let es: EventSource;

        const connect = () => {
            es = new EventSource('/api/pagos/mp/events');
            es.onmessage = (e) => {
                if (e.data === 'pago') cbRef.current();
            };
            es.onerror = () => {
                es.close();
                // Reconnect after 5s if connection drops
                setTimeout(connect, 5000);
            };
        };

        connect();

        return () => {
            es?.close();
        };
    }, []);
}
