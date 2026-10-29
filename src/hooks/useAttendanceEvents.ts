import { useEffect, useRef } from 'react';

export function useAttendanceEvents(onRefresh: () => void) {
    const cbRef = useRef(onRefresh);
    cbRef.current = onRefresh;

    useEffect(() => {
        let es: EventSource;

        const connect = () => {
            es = new EventSource('/api/asistencias/events');
            es.onmessage = (e) => {
                if (e.data === 'refresh') cbRef.current();
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
