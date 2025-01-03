import React from 'react';
import AlumnoCard from '@/components/AlumnoCard';

type AlumnoActionsProps = {
    alumno: any;
    router: any;
    onHistorial: (id: string) => void;
    onEditar: (alumno: any) => void;
    onEliminar: (id: string) => void;
    onIniciarPlan: (id: string) => void;
    onMarcarPago: (id: string) => void;
};

const AlumnoActions: React.FC<AlumnoActionsProps> = ({ alumno, router, onHistorial, onEditar, onEliminar, onIniciarPlan, onMarcarPago }) => (
    <AlumnoCard
        alumno={alumno}
        onHistorial={(id) => router.push(`/alumnos/${id}/historial`)}
        onIniciarPlan={onIniciarPlan}
        onMarcarPago={onMarcarPago}
        onEditar={onEditar}
        onEliminar={onEliminar}
    />
);

export default AlumnoActions;
