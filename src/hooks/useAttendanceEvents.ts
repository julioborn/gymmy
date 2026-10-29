import { useEffect, useRef } from 'react';

export type AttendanceArrival = {
    tipo: 'alumno' | 'depaso';
    id: string;
    nombre: string;
    apellido: string;
    actividad: string;
    fecha: string;
};

export function useAttendanceEvents(onArrivals: (items: AttendanceArrival[]) => void) {
    const cbRef = useRef(onArrivals);
    cbRef.current = onArrivals;

    useEffect(() => {
        let es: EventSource;

        const connect = () => {
            es = new EventSource('/api/asistencias/events');
            es.addEventListener('asistencia', (e) => {
                try {
                    const items = JSON.parse((e as MessageEvent).data) as AttendanceArrival[];
                    cbRef.current(items);
                } catch { /* ignore malformed payload */ }
            });
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
