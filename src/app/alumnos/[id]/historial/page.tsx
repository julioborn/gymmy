'use client';
import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useParams } from 'next/navigation';
import Swal from 'sweetalert2';
import { DateSelectArg, EventClickArg } from '@fullcalendar/core';
import listPlugin from '@fullcalendar/list';

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
    tarifa: number;  // Añadimos la propiedad tarifa
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
    const [calendarView, setCalendarView] = useState<string>('dayGridMonth');
    const [headerToolbar, setHeaderToolbar] = useState({
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,dayGridWeek,dayGridDay', // Vista completa en pantallas grandes
    });
    const [buttonText, setButtonText] = useState({
        today: 'Hoy',
        month: 'Mes',
        week: 'Semana',
        day: 'Día',
        list: 'Lista',
    });

    const adjustCalendarView = () => {
        if (window.innerWidth <= 768) {
            setCalendarView('listWeek'); // Vista de lista en pantallas pequeñas
            setHeaderToolbar({
                left: 'prev,next',
                center: '',
                right: 'dayGridDay,today', // Agregar también otras vistas
            });
            setButtonText({
                today: 'Hoy',
                month: '',
                week: '', // Puedes dejar vacío si no necesitas esta vista en dispositivos pequeños
                day: 'Día',
                list: '', // Texto de la lista en pantallas pequeñas
            });
        } else {
            setCalendarView('dayGridMonth'); // Vista mensual para pantallas grandes
            setHeaderToolbar({
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,dayGridWeek,dayGridDay', // Mostrar todas las vistas en pantallas grandes
            });
            setButtonText({
                today: 'Hoy',
                month: 'Mes',
                week: 'Semana',
                day: 'Día',
                list: 'Lista', // Texto completo para pantallas grandes
            });
        }
    };

    useEffect(() => {
        if (id) {
            fetchAlumno();
        }

        adjustCalendarView(); // Ajusta la vista cuando el componente se carga

        // Detectar cambios en el tamaño de la pantalla
        window.addEventListener('resize', adjustCalendarView);

        // Limpiar el evento cuando se desmonte el componente
        return () => window.removeEventListener('resize', adjustCalendarView);
    }, [id]);

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

    // Ajustamos la creación de eventos para que incluya la tarifa en el título
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
            title: `Pago ${pago.mes}`,   // Este es el título que se mostrará en la primera línea
            start: convertirAFechaLocal(pago.fechaPago),
            display: 'list-item',
            color: '#28a745', // Verde para los pagos
            extendedProps: {
                _id: pago._id,
                tipo: 'pago',
                tarifa: pago.tarifa,  // Pasamos la tarifa en extendedProps
            },
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
            const { value: diasMusculacion } = await Swal.fire({
                title: 'Selecciona los días de musculación por semana',
                input: 'select',
                inputOptions: {
                    1: '1 día por semana',
                    2: '2 días por semana',
                    3: '3 días por semana',
                    4: '4 días por semana',
                    5: '5 días por semana'
                },
                inputPlaceholder: 'Selecciona una opción',
                showCancelButton: true,
            });

            if (diasMusculacion) {
                try {
                    // Obtener la tarifa correspondiente
                    const responseTarifa = await fetch(`/api/alumnos/${id}/tarifas?dias=${diasMusculacion}`);
                    const { tarifa } = await responseTarifa.json();

                    const mesActual = new Date(fechaSeleccionada).toLocaleString('es-ES', { month: 'long' }).toLowerCase();
                    const nuevoPago = {
                        mes: mesActual,
                        fechaPago: new Date(fechaSeleccionada),
                        diasMusculacion: Number(diasMusculacion),
                        tarifa
                    };

                    // Enviar el pago al backend
                    const response = await fetch(`/api/alumnos/pagos`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ alumnoId: id, nuevoPago }),
                    });

                    if (response.ok) {
                        Swal.fire('Pago registrado correctamente', '', 'success');
                        fetchAlumno(); // Refrescar la lista de alumnos
                    } else {
                        throw new Error('Error al registrar el pago');
                    }
                } catch (error) {
                    Swal.fire('Error', 'Ocurrió un problema al registrar el pago', 'error');
                }
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

            if (action === 'editar') {
                // Obtener la fecha y hora del evento
                const fechaActual = clickInfo.event.start ? new Date(clickInfo.event.start) : null;
                const horaActual = fechaActual
                    ? fechaActual.toLocaleTimeString('es-ES', { hour12: false, hour: '2-digit', minute: '2-digit' })
                    : '12:00'; // Valor por defecto si no tiene hora

                // Mostrar un modal para editar la fecha y hora
                const { value: nuevaFechaHora } = await Swal.fire({
                    title: 'Editar Fecha y Hora',
                    html: `
                        <input type="date" id="nueva-fecha-actividad" class="swal2-input" value="${fechaActual?.toISOString().split('T')[0]}">
                        <input type="time" id="nueva-hora-actividad" class="swal2-input" value="${horaActual}" style="width: 150px;">
                    `,
                    focusConfirm: false,
                    preConfirm: () => {
                        const nuevaFecha = (document.getElementById('nueva-fecha-actividad') as HTMLInputElement).value;
                        const nuevaHora = (document.getElementById('nueva-hora-actividad') as HTMLInputElement).value;
                        if (!nuevaFecha || !nuevaHora) {
                            Swal.showValidationMessage('La fecha y la hora no pueden estar vacías');
                        }
                        return `${nuevaFecha}T${nuevaHora}`;
                    },
                    showCancelButton: true,
                });

                if (nuevaFechaHora) {
                    try {
                        const response = await fetch(`/api/asistencias/${eventoId}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                fecha: nuevaFechaHora,
                            }),
                        });

                        if (response.ok) {
                            Swal.fire('Actividad actualizada', '', 'success');
                            fetchAlumno(); // Refrescar la lista de actividades
                        } else {
                            Swal.fire('Error', 'No se pudo actualizar la actividad', 'error');
                        }
                    } catch (error) {
                        Swal.fire('Error', 'Ocurrió un problema al actualizar la actividad', 'error');
                    }
                }
            } else if (action === 'eliminar') {
                try {
                    const response = await fetch(`/api/asistencias/${eventoId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
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
            }
        } else if (tipoEvento === 'pago') {
            const { value: action } = await Swal.fire({
                title: 'Pago',
                input: 'select',
                inputOptions: {
                    editar: 'Editar Pago',
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
            } else if (action === 'editar') {
                const { value: diasMusculacion } = await Swal.fire({
                    title: 'Editar días de musculación por semana',
                    input: 'select',
                    inputOptions: {
                        1: '1 día por semana',
                        2: '2 días por semana',
                        3: '3 días por semana',
                        4: '4 días por semana',
                        5: '5 días por semana',
                    },
                    inputPlaceholder: 'Selecciona una opción',
                    showCancelButton: true,
                });

                if (diasMusculacion) {
                    // Pedir la nueva fecha de pago
                    const { value: nuevaFechaPago } = await Swal.fire({
                        title: 'Editar Fecha de Pago',
                        html: `<input type="date" id="nueva-fecha-pago" class="swal2-input" value="${clickInfo.event.startStr.split('T')[0]}">`,
                        focusConfirm: false,
                        preConfirm: () => {
                            const nuevaFecha = (document.getElementById('nueva-fecha-pago') as HTMLInputElement).value;
                            if (!nuevaFecha) {
                                Swal.showValidationMessage('La fecha no puede estar vacía');
                            }
                            return nuevaFecha;
                        },
                        showCancelButton: true,
                    });

                    if (nuevaFechaPago) {
                        try {
                            // Obtener la tarifa predeterminada basada en los días de musculación
                            const responseTarifa = await fetch(`/api/alumnos/${id}/tarifas?dias=${diasMusculacion}`);
                            const { tarifa } = await responseTarifa.json();

                            // Actualizar el pago con los días de musculación y la nueva tarifa y fecha
                            const response = await fetch(`/api/alumnos/${id}/pagos/${eventoId}`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    nuevaFechaPago,
                                    diasMusculacion: Number(diasMusculacion),
                                    tarifa: tarifa,
                                }),
                            });

                            if (response.ok) {
                                Swal.fire('Pago actualizado correctamente', '', 'success');
                                fetchAlumno(); // Refrescar los datos del alumno
                            } else {
                                Swal.fire('Error', 'No se pudo actualizar el pago', 'error');
                            }
                        } catch (error) {
                            Swal.fire('Error', 'Ocurrió un problema al actualizar el pago', 'error');
                        }
                    }
                }
            }
        }
    };

    return (
        <div className="max-w-6xl mx-auto bg-gray-50 p-8 rounded shadow-md">
            <div className="flex mb-2 justify-center">
                <h2 className="text-3xl font-light text-gray-800 bg-gray-100 p-1 pl-1.5 pr-1.5 rounded border border-gray-500">
                    {alumno.nombre} {alumno.apellido}
                </h2>
            </div>

            {diasRestantes !== null && (
                <p className="text-md font-medium mb-4 p-1 flex justify-center flex-col md:flex-row items-center text-center md:text-left">
                    Finaliza el plan en
                    <span className={`mx-1 pr-1 pl-1 ${obtenerColorSemaforo(diasRestantes)}`}>
                        {diasRestantes}
                    </span>
                    entrenamientos.
                </p>
            )}

            <FullCalendar
                firstDay={1}
                plugins={[dayGridPlugin, interactionPlugin, listPlugin]}
                initialView={calendarView}
                events={events as any}
                locale="es"
                headerToolbar={headerToolbar}
                buttonText={buttonText}
                height="auto"
                selectable={true}
                select={handleDateSelect}
                aspectRatio={1.5}  // Controla la proporción ancho/alto
                eventClick={handleEventClick}
                eventContent={(arg) => {
                    const tipo = arg.event.extendedProps.tipo; // Obtener el tipo de evento

                    if (tipo === 'plan') {
                        // Personalización para el evento de inicio del plan
                        return (
                            <div
                                className="flex items-center justify-center w-full h-full text-xs md:text-sm text-center break-words"
                                style={{ whiteSpace: 'normal' }} // Asegura que el texto se divida en líneas si es necesario
                            >
                                <strong>{arg.event.title}</strong> {/* Mostrar el texto centrado */}
                            </div>
                        );
                    }

                    if (tipo === 'pago') {
                        const pagoMes = arg.event.title;
                        const tarifa = arg.event.extendedProps.tarifa;
                        return (
                            <div className="flex justify-between items-center w-full h-full text-xs md:text-sm cursor-pointer">
                                <div className="flex items-center">
                                    <span
                                        style={{
                                            backgroundColor: arg.event.backgroundColor, // Usamos el color del evento
                                            width: '8px',
                                            height: '8px',
                                            display: 'inline-block',
                                            borderRadius: '50%',
                                            marginRight: '8px',
                                        }}
                                    ></span>
                                    <strong>{pagoMes}</strong> {/* Pago */}
                                </div>
                                <div>
                                    <strong className="text-green-600 mr-1">{`$${tarifa}`}</strong> {/* Tarifa */}
                                </div>
                            </div>
                        );
                    } else if (tipo === 'actividad') {
                        const hora = arg.event.start
                            ? new Date(arg.event.start).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit',
                            })
                            : ''; // Verificamos que no sea null

                        return (
                            <div className="flex justify-between items-center w-full h-full text-xs md:text-sm cursor-pointer">
                                <div className="flex items-center">
                                    <span
                                        style={{
                                            backgroundColor: arg.event.backgroundColor, // Usamos el color del evento
                                            width: '8px',
                                            height: '8px',
                                            display: 'inline-block',
                                            borderRadius: '50%',
                                            marginRight: '8px',
                                        }}
                                    ></span>
                                    <strong>{arg.event.title}</strong> {/* Actividad */}
                                </div>
                                <div>
                                    {hora && <strong className="text-red-600 mr-1">{hora}</strong>} {/* Hora de la actividad */}
                                </div>
                            </div>
                        );
                    } else {
                        return (
                            <div className="flex items-center justify-center w-full h-full text-xs md:text-sm text-center">
                                {arg.event.title}
                            </div>
                        );
                    }
                }}
            />

        </div>
    );
}
