// hooks/useAlumno.ts
import { useEffect, useState } from 'react';

export interface AsistenciaItem {
    fecha: string;
    actividad: string;
    presente: boolean;
}

export interface PlanEntrenamientoHistorialItem {
    _id: string;
    fechaInicio: string;
    fechaFin: string;
    duracion: number;
    asistenciasContadas: number;
    horarioMasFrecuente: string;
}

export interface PagoItem {
    fechaPago: string;
    mes: string;
    metodoPago: string; // era 'metodo'
    tarifa: number;     // era 'monto'
    recargo?: number;
}

export interface Alumno {
    _id: string;
    nombre: string;
    apellido: string;
    asistencia: AsistenciaItem[];
    planEntrenamientoHistorial: PlanEntrenamientoHistorialItem[];
    pagos: PagoItem[]; // ✅ agregado
}

export function useAlumno(id: string) {
    const [alumno, setAlumno] = useState<Alumno | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        const fetchAlumno = async () => {
            try {
                const res = await fetch(`/api/alumnos/${id}`);
                const data = await res.json();
                setAlumno(data);
            } catch (error) {
                console.error('Error fetching alumno', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAlumno();
    }, [id]);

    return { alumno, loading };
}
