'use client';
import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useParams } from 'next/navigation';
import Swal from 'sweetalert2';
import { DateSelectArg, EventClickArg } from '@fullcalendar/core';

type Asistencia = {
    _id: string;
    fecha: string;
    presente: boolean;
    actividad: string;
};

type Pago = {
    _id: string;
    mes: string;
    fechaPago: string;
};

type PlanEntrenamiento = {
    fechaInicio: string;
    duracion: number;
};

type Alumno = {
    _id: string;
    nombre: string;
    apellido: string;
    dni: string;
    asistencia: Asistencia[];
    pagos: Pago[];
    planEntrenamiento: PlanEntrenamiento;
};

// Función para ajustar las fechas a la zona horaria local
const convertirAFechaLocal = (fecha: string) => {
    const fechaUtc = new Date(fecha);
    const fechaLocal = new Date(fechaUtc.getTime() + fechaUtc.getTimezoneOffset() * 60000);
    return fechaLocal.toISOString().split('T')[0]; // Retorna la fecha en formato YYYY-MM-DD
};

// Función para obtener el color del texto del semáforo
function obtenerColorSemaforo(diasRestantes: number | null): string {
    if (diasRestantes === null) return ''; // Si no hay plan o no se ha iniciado
    if (diasRestantes > 10) return 'text-green-500';  // Verde
    if (diasRestantes > 5) return 'text-yellow-500';  // Amarillo
    return 'text-red-500';                            // Rojo
}

export default function HistorialAlumnoPage() {
    const [alumno, setAlumno] = useState<Alumno | null>(null);
    const [diasRestantes, setDiasRestantes] = useState<number | null>(null);
    const params = useParams();
    const { id } = params;

    // Función para obtener los datos del alumno
    const fetchAlumno = async () => {
        const response = await fetch(`/api/alumnos/${id}`);
        if (response.ok) {
            const data = await response.json();
            setAlumno(data);

            // Calcular los días restantes del plan de entrenamiento
            if (data.planEntrenamiento) {
                const fechaInicio = new Date(data.planEntrenamiento.fechaInicio);
                const duracion = data.planEntrenamiento.duracion;

                // Solo contar asistencias de musculación desde la fecha de inicio del plan
                const asistenciasMusculacion = data.asistencia.filter(
                    (asistencia: Asistencia) =>
                        asistencia.actividad === 'Musculación' &&
                        asistencia.presente &&
                        new Date(asistencia.fecha) >= fechaInicio
                ).length;

                const diasRestantes = duracion - asistenciasMusculacion;
                setDiasRestantes(diasRestantes > 0 ? diasRestantes : 0);
            }
        } else {
            console.error('Error fetching alumno');
        }
    };

    useEffect(() => {
        if (id) {
            fetchAlumno();
        }
    }, [id]);

    if (!alumno) {
        return <p>Cargando...</p>;
    }

    const events = [
        ...alumno.asistencia.map((asistencia) => {
            let color = '';
            switch (asistencia.actividad) {
                case 'Musculación':
                    color = '#007bff'; // Azul
                    break;
                case 'Intermitente':
                    color = '#ff851b'; // Naranja
                    break;
                case 'Otro':
                    color = '#f1c40f'; // Amarillo
                    break;
                default:
                    color = '#28a745'; // Verde por defecto
            }
            return asistencia.presente ? {
                title: asistencia.actividad,
                start: asistencia.fecha,
                display: 'list-item',
                color,
                extendedProps: { _id: asistencia._id, tipo: 'actividad' },
            } : null;
        }).filter(event => event !== null),

        alumno.planEntrenamiento.fechaInicio && {
            title: `Inicio del plan (${alumno.planEntrenamiento.duracion})`,
            start: convertirAFechaLocal(alumno.planEntrenamiento.fechaInicio),
            display: 'block',
            color: '#ff0000', // Rojo para el inicio del plan
            extendedProps: { tipo: 'plan' },
        },

        ...alumno.pagos.map((pago) => ({
            title: `Pago ${pago.mes}`,
            start: convertirAFechaLocal(pago.fechaPago),
            display: 'list-item',
            color: '#28a745', // Verde para los pagos
            extendedProps: { _id: pago._id, tipo: 'pago' },
        })),
    ].filter(event => event !== null);

    // Seleccionar fecha para agregar o editar una actividad, plan o pago
    const handleDateSelect = async (selectInfo: DateSelectArg) => {
        const fechaSeleccionada = selectInfo.startStr;

        const { value: action } = await Swal.fire({
            title: 'Seleccionar acción',
            input: 'select',
            inputOptions: {
                plan: 'Ingresar duración del plan',
                actividad: 'Ingresar actividad',
                pago: 'Registrar pago',
            },
            inputPlaceholder: 'Selecciona una opción',
            showCancelButton: true,
        });

        if (action === 'plan') {
            const { value: duracion } = await Swal.fire({
                title: 'Definir duración del plan de entrenamiento',
                input: 'number',
                inputLabel: 'Cantidad de entrenamientos (días)',
                inputPlaceholder: 'Ingresar la cantidad',
                showCancelButton: true,
                inputValidator: (value) => {
                    if (!value || Number(value) <= 0) {
                        return 'Debes ingresar una duración válida';
                    }
                    return null;
                }
            });

            if (duracion) {
                try {
                    const response = await fetch(`/api/alumnos/${id}/plan`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            fechaInicio: fechaSeleccionada,
                            duracion: Number(duracion),
                        }),
                    });

                    if (response.ok) {
                        Swal.fire('Plan de entrenamiento actualizado', '', 'success');
                        fetchAlumno();
                    } else {
                        Swal.fire('Error', 'No se pudo actualizar el plan de entrenamiento', 'error');
                    }
                } catch (error) {
                    Swal.fire('Error', 'Ocurrió un problema al actualizar el plan', 'error');
                }
            }
        } else if (action === 'actividad') {
            const { value: actividad } = await Swal.fire({
                title: 'Ingresar Actividad',
                input: 'select',
                inputOptions: {
                    Musculación: 'Musculación',
                    Intermitente: 'Intermitente',
                    Otro: 'Otro',
                },
                inputPlaceholder: 'Selecciona una actividad',
                showCancelButton: true,
            });

            if (actividad) {
                const { value: fechaHora } = await Swal.fire({
                    title: 'Ingresar Hora',
                    html: `
                        <input type="time" id="hora-actividad" value="12:00" class="swal2-input">
                    `,
                    focusConfirm: false,
                    preConfirm: () => {
                        const hora = (document.getElementById('hora-actividad') as HTMLInputElement).value;
                        if (!hora) {
                            Swal.showValidationMessage('La hora no puede estar vacía');
                        }
                        return `${fechaSeleccionada}T${hora}`;
                    },
                    showCancelButton: true,
                });

                if (fechaHora) {
                    try {
                        const response = await fetch(`/api/asistencias/${id}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                fecha: fechaHora,
                                actividad,
                                presente: true,
                            }),
                        });

                        if (response.ok) {
                            Swal.fire('Actividad registrada', '', 'success');
                            fetchAlumno();
                        } else {
                            Swal.fire('Error', 'No se pudo registrar la actividad', 'error');
                        }
                    } catch (error) {
                        Swal.fire('Error', 'Ocurrió un problema al registrar la actividad', 'error');
                    }
                }
            }
        } else if (action === 'pago') {
            const fechaSeleccionadaLocal = new Date(fechaSeleccionada);
            fechaSeleccionadaLocal.setMinutes(fechaSeleccionadaLocal.getMinutes() + fechaSeleccionadaLocal.getTimezoneOffset()); // Ajustar la fecha seleccionada a UTC si es necesario
        
            const mesActual = fechaSeleccionadaLocal.toLocaleString('es-ES', { month: 'long' }).toLowerCase();
            const nuevoPago = { mes: mesActual, fechaPago: fechaSeleccionadaLocal }; // Usar la fecha ajustada
        
            try {
                const response = await fetch(`/api/alumnos/pagos`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ alumnoId: id, nuevoPago }), // Enviamos el alumnoId y el nuevo pago
                });
        
                if (response.ok) {
                    Swal.fire('Pago registrado', '', 'success');
                    fetchAlumno(); // Refrescar los datos del alumno
                } else {
                    throw new Error('No se pudo registrar el pago');
                }
            } catch (error) {
                Swal.fire('Error', 'Ocurrió un problema al registrar el pago', 'error');
            }
        }
    };

    // Editar o eliminar una actividad o un pago existente
    const handleEventClick = async (clickInfo: EventClickArg) => {
        const eventoId = clickInfo.event.extendedProps._id;
        const tipoEvento = clickInfo.event.extendedProps.tipo;

        if (tipoEvento === 'actividad') {
            const { value: action } = await Swal.fire({
                title: 'Actividad',
                input: 'select',
                inputOptions: {
                    editar: 'Editar Actividad',
                    eliminar: 'Eliminar Actividad',
                },
                inputPlaceholder: 'Selecciona una acción',
                showCancelButton: true,
            });

            if (action === 'eliminar') {
                try {
                    const response = await fetch(`/api/asistencias/${id}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ asistenciaId: eventoId }),
                    });

                    if (response.ok) {
                        Swal.fire('Actividad eliminada', '', 'success');
                        fetchAlumno();
                    } else {
                        Swal.fire('Error', 'No se pudo eliminar la actividad', 'error');
                    }
                } catch (error) {
                    Swal.fire('Error', 'Hubo un problema al eliminar la actividad', 'error');
                }
            } else if (action === 'editar') {
                const { value: nuevaActividad } = await Swal.fire({
                    title: 'Editar Actividad',
                    input: 'select',
                    inputOptions: {
                        Musculación: 'Musculación',
                        Intermitente: 'Intermitente',
                        Otro: 'Otro',
                    },
                    inputPlaceholder: 'Selecciona una actividad',
                    showCancelButton: true,
                });

                const { value: nuevaFechaHora } = await Swal.fire({
                    title: 'Editar Fecha y Hora',
                    html: `
                        <input type="date" id="nueva-fecha-actividad" class="swal2-input" value="${clickInfo.event.startStr.split('T')[0]}">
                        <input type="time" id="nueva-hora-actividad" class="swal2-input" value="12:00">
                    `,
                    focusConfirm: false,
                    preConfirm: () => {
                        const fecha = (document.getElementById('nueva-fecha-actividad') as HTMLInputElement).value;
                        const hora = (document.getElementById('nueva-hora-actividad') as HTMLInputElement).value;
                        if (!fecha || !hora) {
                            Swal.showValidationMessage('La fecha y la hora no pueden estar vacías');
                        }
                        return `${fecha}T${hora}`;
                    },
                    showCancelButton: true,
                });

                if (nuevaActividad && nuevaFechaHora) {
                    try {
                        const response = await fetch(`/api/asistencias/${id}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                asistenciaId: eventoId,
                                fecha: nuevaFechaHora,
                                actividad: nuevaActividad,
                            }),
                        });

                        if (response.ok) {
                            Swal.fire('Actividad actualizada', '', 'success');
                            fetchAlumno();
                        } else {
                            Swal.fire('Error', 'No se pudo actualizar la actividad', 'error');
                        }
                    } catch (error) {
                        Swal.fire('Error', 'Hubo un problema al actualizar la actividad', 'error');
                    }
                }
            }
        } else if (tipoEvento === 'pago') {
            const { value: action } = await Swal.fire({
                title: 'Pago',
                input: 'select',
                inputOptions: {
                    // editar: 'Editar Pago',
                    eliminar: 'Eliminar Pago',
                },
                inputPlaceholder: 'Selecciona una acción',
                showCancelButton: true,
            });

            if (action === 'eliminar') {
                try {
                    const response = await fetch(`/api/alumnos/${id}/pagos/${eventoId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });

                    if (response.ok) {
                        Swal.fire('Pago eliminado', '', 'success');
                        fetchAlumno();
                    } else {
                        Swal.fire('Error', 'No se pudo eliminar el pago', 'error');
                    }
                } catch (error) {
                    Swal.fire('Error', 'Hubo un problema al eliminar el pago', 'error');
                }
            } //else if (action === 'editar') {
            //     const { value: nuevaFechaPago } = await Swal.fire({
            //         title: 'Editar Fecha de Pago',
            //         html: `
            //             <input type="date" id="nueva-fecha-pago" class="swal2-input" value="${clickInfo.event.startStr.split('T')[0]}">
            //         `,
            //         focusConfirm: false,
            //         preConfirm: () => {
            //             const nuevaFecha = (document.getElementById('nueva-fecha-pago') as HTMLInputElement).value;
            //             if (!nuevaFecha) {
            //                 Swal.showValidationMessage('La fecha no puede estar vacía');
            //             }
            //             return nuevaFecha;
            //         },
            //         showCancelButton: true,
            //     });

            //     if (nuevaFechaPago) {
            //         try {
            //             const response = await fetch(`/api/alumnos/${id}/pagos/${eventoId}`, {
            //                 method: 'PUT',
            //                 headers: {
            //                     'Content-Type': 'application/json',
            //                 },
            //                 body: JSON.stringify({
            //                     nuevaFechaPago,
            //                 }),
            //             });

            //             if (response.ok) {
            //                 Swal.fire('Pago actualizado', '', 'success');
            //                 fetchAlumno();
            //             } else {
            //                 Swal.fire('Error', 'No se pudo actualizar el pago', 'error');
            //             }
            //         } catch (error) {
            //             Swal.fire('Error', 'Hubo un problema al actualizar el pago', 'error');
            //         }
            //     }
            // }
        }
    };

    return (
        <div className="max-w-6xl mx-auto bg-gray-50 p-8 rounded shadow-md">
            <div className="flex mb-2">
                <h2 className="text-3xl font-light text-gray-800 bg-gray-100 p-1 pl-1.5 pr-1.5 rounded border border-gray-500">
                    {alumno.nombre} {alumno.apellido}
                </h2>
            </div>

            {diasRestantes !== null && (
                <p className="text-md font-medium mb-4 p-1 flex">
                    Su plan finaliza en{' '}
                    <span className={`mx-1 pr-1 pl-1 ${obtenerColorSemaforo(diasRestantes)}`}>
                        {diasRestantes}
                    </span>{' '}
                    entrenamientos.
                </p>
            )}

            <FullCalendar
                firstDay={1}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={events as any}
                locale="es"
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,dayGridWeek,dayGridDay',
                }}
                buttonText={{
                    today: 'Hoy',
                    month: 'Mes',
                    week: 'Semana',
                    day: 'Día',
                }}
                height="auto"
                selectable={true}
                select={handleDateSelect}
                eventClick={handleEventClick}
            />
        </div>
    );
}
