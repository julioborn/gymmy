'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePaymentEvents } from '@/hooks/usePaymentEvents';
import Swal from 'sweetalert2';
import Modal from 'react-modal';
import AlumnoActions from '@/components/AlumnoActions';
import { Pagination } from '@mui/material';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import { swalBase, swalDanger, swalNotify } from '@/utils/swalConfig';

// Lazy loading de componentes
const FiltrosAlumnos = React.lazy(() => import('@/components/FiltroAlumnos'));
const ModalEditAlumno = React.lazy(() => import('@/components/ModalEditAlumno'));
const ModalEditTarifas = React.lazy(() => import('@/components/ModalEditTarifas'));

// Configura react-modal para el body
Modal.setAppElement('body');

type Tarifa = {
    dias: number;
    valor: number;
};

// Función para calcular la edad a partir de la fecha de nacimiento
function calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }
    return edad;
}

// Función para calcular los días restantes del plan de entrenamiento
function calcularDiasRestantes(plan: any, asistencias: any[]): number | null {
    if (!plan || !plan.fechaInicio || !plan.duracion) return null;

    const fechaInicio = new Date(plan.fechaInicio);
    const duracion = plan.duracion;

    const asistenciasMusculacion = asistencias.filter(
        (asistencia) => asistencia.actividad === 'Musculación' && asistencia.presente &&
            new Date(asistencia.fecha) >= fechaInicio
    ).length;

    const diasRestantes = duracion - asistenciasMusculacion;
    return diasRestantes > 0 ? diasRestantes : 0;
}

// Función para verificar si el alumno pagó el mes actual
function verificarPagoMesActual(pagos: any[]): boolean {
    const mesActual = new Date().toLocaleString('es-ES', { month: 'long' }).toLowerCase();
    return pagos.some(pago => pago.mes.toLowerCase() === mesActual);
}

export default function ListaAlumnosPage() {
    const { data: session } = useSession(); // Obtener la sesión
    const [alumnos, setAlumnos] = useState<any[]>([]);
    const [editandoAlumno, setEditandoAlumno] = useState<any | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [filtroLetraApellido, setFiltroLetraApellido] = useState('');
    const [filtroPago, setFiltroPago] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [ordenDiasRestantes, setOrdenDiasRestantes] = useState('');
    const [tarifas, setTarifas] = useState<Tarifa[]>([]);
    const [recargoDiez, setRecargoDiez] = useState<number>(0);
    const [recargoMes, setRecargoMes] = useState<number>(0);
    const router = useRouter();
    const [editandoTarifas, setEditandoTarifas] = useState(false);
    const [page, setPage] = useState(1); // Página actual
    const [itemsPerPage] = useState(10); // Cantidad de elementos por página
    const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<any | null>(null);
    const [filtroDiasEntrena, setFiltroDiasEntrena] = useState('');
    const [acento, setAcento] = useState('#10b981');
    const [acento2, setAcento2] = useState('#f97316');

    const fetchAlumnos = async () => {
        setIsLoading(true); // Inicia la carga
        try {
            const response = await fetch('/api/alumnos');
            if (!response.ok) throw new Error('Error en la solicitud');

            const data = await response.json();
            const alumnosConDatos = data.map((alumno: any) => {
                const diasRestantes = calcularDiasRestantes(alumno.planEntrenamiento, alumno.asistencia);
                const edad = alumno.fechaNacimiento ? calcularEdad(alumno.fechaNacimiento) : null; // Calcula la edad si la fecha de nacimiento está disponible
                return { ...alumno, diasRestantes, edad };
            });

            setAlumnos(alumnosConDatos); // No necesitas await aquí, el cálculo es síncrono
        } catch {
            // silenced
        } finally {
            setIsLoading(false); // Finaliza la carga
        }
    };

    useEffect(() => {
        fetchAlumnos();
        fetch('/api/gimnasio/tema')
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.temaAcento) setAcento(d.temaAcento); if (d?.temaAcento2) setAcento2(d.temaAcento2); })
            .catch(() => {});
    }, []);

    usePaymentEvents(fetchAlumnos);

    const fetchTarifas = async () => {
        try {
            const response = await fetch('/api/tarifas');
            const data = await response.json();

            // ✔️ si data viene como { ok: true, tarifas: [...], recargo: 1000 }
            if (data.ok && Array.isArray(data.tarifas)) {
                setTarifas(data.tarifas);
            }
        } catch {
            // silenced
        }
    };

    const handleConfiguracionTarifas = async () => {
        if (tarifas.length === 0) {
            await Swal.fire({ ...swalNotify, icon: 'error', title: 'Error', text: 'No se encontraron cuotas. Por favor, recarga la página.' });
            return;
        }

        const tarifaInputs = tarifas
            .map(tarifa => `
                <div>
                    <label class="swal-form-label">Días ${tarifa.dias} por semana</label>
                    <input type="text" inputmode="numeric" id="tarifa-${tarifa.dias}" class="swal2-input" value="${tarifa.valor}">
                </div>
            `).join('');

        const result = await Swal.fire({
            ...swalBase,
            title: 'Configurar Cuotas',
            html: `<div class="swal-form-body">${tarifaInputs}</div>`,
            focusConfirm: false,
            showCancelButton: true,
            preConfirm: () => {
                const updatedTarifas = tarifas.map((tarifa) => {
                    const valor = (document.getElementById(`tarifa-${tarifa.dias}`) as HTMLInputElement).value;
                    return { ...tarifa, valor: Number(valor) };
                });
                return updatedTarifas;
            },
            confirmButtonText: 'Aceptar',
            cancelButtonText: 'Cancelar',
        });

        const nuevasTarifas = result.value as Tarifa[] | undefined;
        if (nuevasTarifas) {
            try {
                const response = await fetch('/api/tarifas', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nuevasTarifas),
                });
                if (response.ok) {
                    Swal.fire({ ...swalNotify, icon: 'success', title: 'Tarifas actualizadas' });
                    setTarifas(nuevasTarifas);
                } else {
                    Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudieron actualizar las tarifas' });
                }
            } catch {
                Swal.fire({ ...swalNotify, icon: 'error', title: 'Ocurrió un problema al actualizar las tarifas' });
            }
        }
    };

    useEffect(() => {
        fetchTarifas(); // Llama a fetchTarifas una vez al montar el componente
    }, []);

    const guardarAlumno = async (id: string, alumnoActualizado: any) => {
        try {
            const response = await fetch(`/api/alumnos`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id, ...alumnoActualizado }),
            });

            if (!response.ok) {
                throw new Error('Error al actualizar alumno');
            }

            const data = await response.json();
            setAlumnos((prevAlumnos) =>
                prevAlumnos.map((alumno) =>
                    alumno._id === id ? { ...alumno, ...data } : alumno
                )
            );
            setEditandoAlumno(null);

            Swal.fire({ ...swalNotify, icon: 'success', title: 'Alumno actualizado correctamente', showConfirmButton: false, timer: 1500 });

        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al actualizar el alumno', text: 'Hubo un problema al guardar los cambios.' });
        }
    };

    const eliminarAlumno = async (id: string) => {
        const result = await Swal.fire({
            ...swalDanger,
            title: '¿Eliminar alumno?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`/api/alumnos`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ id }),
                });

                if (!response.ok) {
                    throw new Error('Error al eliminar alumno');
                }

                const alumnoEliminado = await response.json();
                setAlumnos((prevAlumnos) => prevAlumnos.filter((alumno) => alumno._id !== alumnoEliminado._id));

                Swal.fire({ ...swalNotify, icon: 'success', title: 'Alumno eliminado correctamente', showConfirmButton: false, timer: 1500 });

            } catch {
                Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al eliminar el alumno', text: 'Hubo un problema al intentar eliminar el alumno.' });
            }
        }
    };

    const marcarPagoMes = async (alumnoId: string) => {
        const opcionesTarifas = tarifas.reduce((options, tarifa) => {
            options[tarifa.dias] = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>${tarifa.dias} día${tarifa.dias > 1 ? 's' : ''} por semana</span>
                    <strong>$${tarifa.valor}</strong>
                </div>`;
            return options;
        }, {} as Record<number, string>);

        const { value: diasMusculacion } = await Swal.fire({
            ...swalBase,
            title: 'Días de musculación por semana',
            input: 'select',
            inputOptions: opcionesTarifas,
            inputPlaceholder: 'Selecciona una opción',
            showCancelButton: true,
            confirmButtonText: 'Aceptar',
            cancelButtonText: 'Cancelar',
        });

        if (diasMusculacion) {
            const tarifaSeleccionada = tarifas.find(
                (tarifa) => tarifa.dias === Number(diasMusculacion)
            );

            if (!tarifaSeleccionada) {
                Swal.fire({ ...swalNotify, icon: 'error', title: 'No se encontró una tarifa para los días seleccionados.' });
                return;
            }

            const { value: metodoPago } = await Swal.fire({
                ...swalBase,
                title: 'Método de pago',
                input: 'radio',
                inputOptions: {
                    efectivo: 'Efectivo',
                    transferencia: 'Transferencia',
                },
                inputValidator: (value) => {
                    if (!value) return 'Debes seleccionar un método de pago';
                    return null;
                },
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });

            if (!metodoPago) return; // Cancelado

            const confirmacion = await Swal.fire({
                ...swalBase,
                title: 'Confirmar cobro',
                html: `
                    <div class="swal-form-body">
                        <p style="text-align:center;color:#475569;font-size:0.875rem;margin:0 0 0.75rem;">
                            Días de musculación: <strong>${diasMusculacion}</strong><br>
                            Método: <strong>${metodoPago === 'efectivo' ? 'Efectivo' : 'Transferencia'}</strong><br>
                            Precio: <strong>$${tarifaSeleccionada.valor}</strong>
                        </p>
                        ${(() => {
                            const hoy = new Date();
                            const esMesPasado = false; // en alumnos siempre es mes actual
                            const esDespuesDel10 = hoy.getDate() > 10;
                            const montoR = esMesPasado ? recargoMes : esDespuesDel10 ? recargoDiez : 0;
                            const labelR = esMesPasado ? `Recargo mes vencido ($${recargoMes.toFixed(2)})` : `Recargo por día 10 ($${recargoDiez.toFixed(2)})`;
                            return montoR > 0 ? `
                            <label class="swal-form-label" style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;text-transform:none;font-size:0.85rem;color:#334155;">
                                <input type="checkbox" id="swal-aplicar-recargo" checked style="width:16px;height:16px;accent-color:#059669;">
                                ${labelR}
                            </label>` : '';
                        })()}
                    </div>
                `,
                preConfirm: () => {
                    const checkbox = document.getElementById('swal-aplicar-recargo') as HTMLInputElement;
                    return { aplicarRecargo: checkbox?.checked ?? false };
                },
                showCancelButton: true,
                confirmButtonText: 'Cobrar',
                cancelButtonText: 'Cancelar',
            });

            if (confirmacion.isConfirmed) {
                try {
                    const aplicarRecargo = confirmacion.value?.aplicarRecargo;
                    const mesActual = new Date()
                        .toLocaleString('es-ES', { month: 'long' })
                        .toLowerCase();

                    const hoyRec = new Date();
                    const recargoAplicable = hoyRec.getDate() > 10 ? recargoDiez : 0;
                    const montoRecargo = aplicarRecargo ? recargoAplicable : 0;
                    const total = tarifaSeleccionada.valor + montoRecargo;

                    const nuevoPago = {
                        mes: mesActual,
                        fechaPago: new Date(),
                        diasMusculacion: Number(diasMusculacion),
                        tarifa: tarifaSeleccionada.valor,
                        metodoPago,
                        recargo: montoRecargo,
                        totalPagado: total,
                    };

                    const response = await fetch(`/api/alumnos/pagos`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ alumnoId, nuevoPago }),
                    });

                    if (!response.ok) {
                        throw new Error('Error al registrar el pago');
                    }

                    Swal.fire({ ...swalNotify, icon: 'success', title: 'Pago registrado correctamente' });
                    fetchAlumnos();
                } catch {
                    Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al registrar el pago', text: 'Hubo un problema al registrar el pago.' });
                }
            }

        }
    };

    const guardarTarifas = async (nuevasTarifas: Tarifa[]) => {
        try {
            const response = await fetch('/api/tarifas', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevasTarifas),
            });

            if (!response.ok) throw new Error('Error al actualizar tarifas');

            Swal.fire({ ...swalNotify, icon: 'success', title: 'Tarifas actualizadas' });
            setTarifas(nuevasTarifas);
            setEditandoTarifas(false);
        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudieron actualizar las tarifas' });
        }
    };

    const iniciarPlan = async (alumnoId: string) => {
        const { value: formValues } = await Swal.fire({
            ...swalBase,
            title: 'Iniciar plan de entrenamiento',
            html: `
                <div class="swal-form-body">
                    <label class="swal-form-label">Duración (clases)</label>
                    <input type="number" id="duracion" class="swal2-input" placeholder="Ej: 20">
                    <label class="swal-form-label">Fecha de inicio</label>
                    <input type="date" id="fecha" class="swal2-input" value="${new Date().toISOString().split('T')[0]}">
                </div>
            `,
            showCancelButton: true,
            focusConfirm: false,
            preConfirm: () => {
                const duracion = (document.getElementById('duracion') as HTMLInputElement).value;
                const fecha = (document.getElementById('fecha') as HTMLInputElement).value;
                if (!duracion || Number(duracion) <= 0) {
                    Swal.showValidationMessage('Debes ingresar una duración válida');
                }
                if (!fecha) {
                    Swal.showValidationMessage('Debes seleccionar una fecha de inicio');
                }
                return { duracion: Number(duracion), fechaInicio: fecha };
            },
            confirmButtonText: 'Aceptar',
            cancelButtonText: 'Cancelar',
        });

        if (formValues) {
            try {
                const response = await fetch(`/api/alumnos/${alumnoId}/plan`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        fechaInicio: formValues.fechaInicio,
                        duracion: formValues.duracion,
                        terminado: false,
                    }),
                });

                if (response.ok) {
                    Swal.fire({ ...swalNotify, icon: 'success', title: 'Plan de entrenamiento iniciado' });
                    fetchAlumnos();
                } else {
                    Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo iniciar el plan de entrenamiento' });
                }
            } catch {
                Swal.fire({ ...swalNotify, icon: 'error', title: 'Ocurrió un problema al iniciar el plan' });
            }
        }
    };

    const alumnosFiltrados = alumnos
        .filter((alumno) => {
            const coincideBusqueda = alumno.nombre.toLowerCase().includes(busqueda.toLowerCase()) || alumno.dni.includes(busqueda);
            const coincideLetraApellido = filtroLetraApellido ? alumno.apellido.startsWith(filtroLetraApellido) : true;
            const coincideDiasEntrena = filtroDiasEntrena
                ? alumno.diasEntrenaSemana === parseInt(filtroDiasEntrena)
                : true;

            const coincidePago = filtroPago === '' // Filtrar por pago
                ? true
                : filtroPago === 'pagado'
                    ? verificarPagoMesActual(alumno.pagos)
                    : !verificarPagoMesActual(alumno.pagos);

            return coincideBusqueda && coincideLetraApellido && coincidePago && coincideDiasEntrena;

        })
        .sort((a, b) => {
            if (ordenDiasRestantes === 'asc') {
                return (a.diasRestantes ?? Infinity) - (b.diasRestantes ?? Infinity);
            } else if (ordenDiasRestantes === 'desc') {
                return (b.diasRestantes ?? Infinity) - (a.diasRestantes ?? Infinity);
            } else {
                // Orden alfabético por defecto si no se selecciona asc/desc
                return a.apellido.localeCompare(b.apellido);
            }
        });

    // Paginación aplicada sobre los alumnos filtrados
    const paginatedAlumnos = alumnosFiltrados.slice(
        (page - 1) * itemsPerPage,
        page * itemsPerPage
    );

    const Loader = () => (
        <div className="flex justify-center items-center h-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-400"></div>
        </div>
    );

    useEffect(() => {
        fetchRecargo();
    }, []);

    const fetchRecargo = async () => {
        try {
            const response = await fetch('/api/recargo');
            const data = await response.json();
            setRecargoDiez(data.montoDiez ?? 0);
            setRecargoMes(data.montoMes ?? 0);
        } catch {
            // silenced
        }
    };

    const handleConfiguracionRecargos = async () => {
        const { value: result } = await Swal.fire({
            ...swalBase,
            title: 'Configurar Recargos',
            html: `
                <div class="swal-form-body">
                    <div style="margin-bottom:1rem;">
                        <label class="swal-form-label">Recargo pasando el día 10 del mes ($)</label>
                        <input type="text" inputmode="numeric" id="recargo-diez" class="swal2-input" value="${recargoDiez}" placeholder="0">
                    </div>
                    <div>
                        <label class="swal-form-label">Recargo pasando el mes completo ($)</label>
                        <input type="text" inputmode="numeric" id="recargo-mes" class="swal2-input" value="${recargoMes}" placeholder="0">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const rawD = (document.getElementById('recargo-diez') as HTMLInputElement)?.value ?? '';
                const rawM = (document.getElementById('recargo-mes') as HTMLInputElement)?.value ?? '';
                const d = parseInt(rawD.replace(/\D/g, ''), 10) || 0;
                const m = parseInt(rawM.replace(/\D/g, ''), 10) || 0;
                return { montoDiez: d, montoMes: m };
            },
        });

        if (result) {
            try {
                const response = await fetch('/api/recargo', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(result),
                });
                if (response.ok) {
                    setRecargoDiez(result.montoDiez);
                    setRecargoMes(result.montoMes);
                    Swal.fire({ ...swalNotify, icon: 'success', title: 'Recargos actualizados' });
                } else {
                    Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudieron actualizar los recargos' });
                }
            } catch {
                Swal.fire({ ...swalNotify, icon: 'error', title: 'Ocurrió un problema al actualizar los recargos' });
            }
        }
    };

    // Cambiar la página al interactuar con el componente Pagination
    const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value);
    };

    const handleGenerateExcel = () => {
        // Función para calcular la franja horaria
        const categorizarFranjaHoraria = (horario: string) => {
            const [hora] = horario.split(':').map(Number); // Obtener la hora como número
            if (hora >= 7 && hora < 12) return 'Mañana';
            if (hora >= 12 && hora < 16) return 'Siesta';
            if (hora >= 16 && hora < 24) return 'Tarde';
            return '-'; // En caso de horarios fuera de rango
        };

        // Función para calcular el horario más frecuente del mes actual
        const calcularHorarioMasFrecuenteDelMes = (asistencias: any[]) => {
            const mesActual = new Date().getMonth(); // Mes actual (0 = enero, 1 = febrero, ...)
            const añoActual = new Date().getFullYear(); // Año actual

            const horarios = asistencias
                .filter((asistencia: { fecha: string | number | Date; actividad: string }) => {
                    const fechaAsistencia = new Date(asistencia.fecha);
                    return (
                        asistencia.actividad === 'Musculación' &&
                        fechaAsistencia.getMonth() === mesActual &&
                        fechaAsistencia.getFullYear() === añoActual
                    );
                })
                .map((asistencia: { fecha: string | number | Date }) =>
                    new Date(asistencia.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
                );

            if (horarios.length === 0) return '-'; // Si no hay asistencias, devolver '-'

            // Calcular frecuencia de cada horario
            const frecuencia = horarios.reduce((acc: { [x: string]: any }, horario: string | number) => {
                acc[horario] = (acc[horario] || 0) + 1;
                return acc;
            }, {});

            // Determinar el horario más frecuente
            const horarioMasFrecuente = Object.keys(frecuencia).reduce((a, b) => (frecuencia[a] > frecuencia[b] ? a : b));

            // Categorizar el horario más frecuente en una franja horaria
            return categorizarFranjaHoraria(horarioMasFrecuente);
        };

        // Formatear los datos para el archivo Excel
        const formattedData = alumnos.map((alumno) => {
            const pagoMesActual = alumno.pagos.find(
                (pago: { mes: string }) =>
                    pago.mes.toLowerCase() ===
                    new Date().toLocaleString('es-ES', { month: 'long' }).toLowerCase()
            );

            // Calcular el horario más frecuente del mes
            const horarioMasFrecuenteDelMes = calcularHorarioMasFrecuenteDelMes(alumno.asistencia || []);

            return {
                Apellido: alumno.apellido,
                Nombre: alumno.nombre,
                Pago: pagoMesActual ? `$${pagoMesActual.tarifa}` : 'No pagó',
                'Fecha de Pago': pagoMesActual
                    ? new Date(pagoMesActual.fechaPago).toLocaleDateString('es-ES')
                    : '-',
                Adeuda: pagoMesActual ? 'No' : 'Sí',
                'Días que asiste': alumno.diasEntrenaSemana || '-', // Mostrar los días que entrena por semana
                Horario: horarioMasFrecuenteDelMes, // Franja horaria más frecuente
                Mes: new Date().toLocaleString('es-ES', { month: 'long' }),
            };
        });

        // Crear el libro y la hoja de trabajo
        const worksheet = XLSX.utils.json_to_sheet(formattedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Balance Mensual');

        // Generar el archivo Excel
        XLSX.writeFile(workbook, `Balance_Mensual_${new Date().toLocaleDateString('es-ES')}.xlsx`);
    };

    const handleEditarAlumno = async (alumno: any) => {
        setAlumnoSeleccionado(null); // Cerrar el modal para evitar solapamientos

        const { value: formValues } = await Swal.fire({
            ...swalBase,
            title: 'Editar alumno',
            html: `
                <div class="swal-form-body swal-form-grid">
                    <div>
                        <label class="swal-form-label">Nombre</label>
                        <input id="swal-nombre" class="swal2-input" value="${alumno.nombre || ''}">
                    </div>
                    <div>
                        <label class="swal-form-label">Apellido</label>
                        <input id="swal-apellido" class="swal2-input" value="${alumno.apellido || ''}">
                    </div>
                    <div>
                        <label class="swal-form-label">DNI</label>
                        <input id="swal-dni" class="swal2-input" value="${alumno.dni || ''}">
                    </div>
                    <div>
                        <label class="swal-form-label">Teléfono</label>
                        <input id="swal-telefono" class="swal2-input" value="${alumno.telefono || ''}">
                    </div>
                    <div>
                        <label class="swal-form-label">Email</label>
                        <input id="swal-email" class="swal2-input" value="${alumno.email || ''}">
                    </div>
                    <div>
                        <label class="swal-form-label">Franja horaria</label>
                        <select id="swal-horario" class="swal2-select">
                            <option value="">Selecciona una franja</option>
                            <option value="mañana" ${alumno.horarioEntrenamiento === 'mañana' ? 'selected' : ''}>Mañana</option>
                            <option value="siesta" ${alumno.horarioEntrenamiento === 'siesta' ? 'selected' : ''}>Siesta</option>
                            <option value="tarde" ${alumno.horarioEntrenamiento === 'tarde' ? 'selected' : ''}>Tarde</option>
                        </select>
                    </div>
                    <div>
                        <label class="swal-form-label">Hora exacta</label>
                        <input id="swal-hora-exacta" class="swal2-input" type="time" value="${alumno.horaExactaEntrenamiento || ''}">
                    </div>
                    <div class="swal-full-row">
                        <label class="swal-form-label">Historial deportivo</label>
                        <textarea id="swal-historial-deportivo" class="swal2-textarea">${alumno.historialDeportivo || ''}</textarea>
                    </div>
                    <div class="swal-full-row">
                        <label class="swal-form-label">Historial de vida</label>
                        <textarea id="swal-historial-vida" class="swal2-textarea">${alumno.historialDeVida || ''}</textarea>
                    </div>
                    <div class="swal-full-row">
                        <label class="swal-form-label">Objetivos</label>
                        <textarea id="swal-objetivos" class="swal2-textarea">${alumno.objetivos || ''}</textarea>
                    </div>
                    <div class="swal-full-row">
                        <label class="swal-form-label">Patologías</label>
                        <textarea id="swal-patologias" class="swal2-textarea">${alumno.patologias || ''}</textarea>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            width: '50rem',
            preConfirm: () => {
                return {
                    nombre: (document.getElementById('swal-nombre') as HTMLInputElement).value,
                    apellido: (document.getElementById('swal-apellido') as HTMLInputElement).value,
                    dni: (document.getElementById('swal-dni') as HTMLInputElement).value,
                    telefono: (document.getElementById('swal-telefono') as HTMLInputElement).value,
                    email: (document.getElementById('swal-email') as HTMLInputElement).value,
                    horarioEntrenamiento: (document.getElementById('swal-horario') as HTMLInputElement).value,
                    horaExactaEntrenamiento: (document.getElementById('swal-hora-exacta') as HTMLInputElement).value,
                    historialDeportivo: (document.getElementById('swal-historial-deportivo') as HTMLTextAreaElement).value,
                    historialDeVida: (document.getElementById('swal-historial-vida') as HTMLTextAreaElement).value,
                    objetivos: (document.getElementById('swal-objetivos') as HTMLTextAreaElement).value,
                    patologias: (document.getElementById('swal-patologias') as HTMLTextAreaElement).value,
                };
            },
        });

        if (formValues) {
            await guardarAlumno(alumno._id, { ...alumno, ...formValues });
        }
    };

    const handleResetPassword = async (alumno: any) => {
        const { value: newPassword } = await Swal.fire({
            ...swalBase,
            title: 'Nueva contraseña',
            html: `
                <div class="swal-form-body">
                    <p style="color:#475569;font-size:0.875rem;margin:0 0 1rem;">
                        Establecé una nueva contraseña para <strong>${alumno.nombre} ${alumno.apellido}</strong>.
                    </p>
                    <label class="swal-form-label">Contraseña</label>
                    <input type="password" id="swal-new-pwd" class="swal2-input" placeholder="Mínimo 6 caracteres">
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const val = (document.getElementById('swal-new-pwd') as HTMLInputElement).value;
                if (!val || val.length < 6) {
                    Swal.showValidationMessage('Mínimo 6 caracteres');
                    return false;
                }
                return val;
            },
        });

        if (!newPassword) return;

        try {
            const res = await fetch(`/api/alumnos/${alumno._id}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPassword }),
            });
            if (res.ok) {
                Swal.fire({ ...swalNotify, icon: 'success', title: 'Contraseña actualizada' });
            } else {
                const data = await res.json();
                Swal.fire({ ...swalNotify, icon: 'error', title: data.error || 'Error al actualizar la contraseña' });
            }
        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'Error de conexión' });
        }
    };

    function capitalizar(texto: string) {
        return texto ? texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase() : '-';
    }

    const card = 'bg-white border border-black/[0.07] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_14px_rgba(0,0,0,0.04)]';
    const lbl = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest';

    return (
        <div className="max-w-lg mx-auto pt-4 pb-12 px-4 space-y-5">

            {/* Banner */}
            <div className="relative bg-[#111] rounded-2xl px-5 pt-5 pb-5 overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.05),transparent_55%)]" />
                <div className="pointer-events-none absolute -bottom-8 -right-4 w-36 h-36 rounded-full blur-3xl opacity-25" style={{ background: acento2 }} />
                <div className="relative">
                    <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest">Gestión de alumnos</p>
                    <h1 className="text-xl font-bold text-white mt-0.5">Alumnos</h1>
                    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        {!isLoading && (
                            <span className="bg-white/10 ring-1 ring-white/10 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                                {alumnos.length} inscriptos
                            </span>
                        )}
                        <button
                            className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-full text-white transition-all active:scale-95"
                            style={{ background: acento }}
                            onClick={() => router.push('/alumnos/nuevo')}
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Registrar
                        </button>
                        <button className="px-3 py-1 bg-white/10 hover:bg-white/15 active:scale-95 text-white text-[11px] font-semibold rounded-full transition-all" onClick={handleConfiguracionTarifas}>Cuotas</button>
                        <button className="px-3 py-1 bg-white/10 hover:bg-white/15 active:scale-95 text-white text-[11px] font-semibold rounded-full transition-all" onClick={handleConfiguracionRecargos}>Recargo</button>
                        {session?.user?.role === 'dueño' && (
                            <button
                                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 active:scale-95 text-white px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
                                onClick={handleGenerateExcel}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="12" height="12" viewBox="0 0 48 48">
                                    <path fill="#169154" d="M29,6H15.744C14.781,6,14,6.781,14,7.744v7.259h15V6z"></path>
                                    <path fill="#18482a" d="M14,33.054v7.202C14,41.219,14.781,42,15.743,42H29v-8.946H14z"></path>
                                    <path fill="#0c8045" d="M14 15.003H29V24.005000000000003H14z"></path>
                                    <path fill="#17472a" d="M14 24.005H29V33.055H14z"></path>
                                    <g>
                                        <path fill="#29c27f" d="M42.256,6H29v9.003h15V7.744C44,6.781,43.219,6,42.256,6z"></path>
                                        <path fill="#27663f" d="M29,33.054V42h13.257C43.219,42,44,41.219,44,40.257v-7.202H29z"></path>
                                        <path fill="#19ac65" d="M29 15.003H44V24.005000000000003H29z"></path>
                                        <path fill="#129652" d="M29 24.005H44V33.055H29z"></path>
                                    </g>
                                    <path fill="#0c7238" d="M22.319,34H5.681C4.753,34,4,33.247,4,32.319V15.681C4,14.753,4.753,14,5.681,14h16.638 C23.247,14,24,14.753,24,15.681v16.638C24,33.247,23.247,34,22.319,34z"></path>
                                    <path fill="#fff" d="M9.807 19L12.193 19 14.129 22.754 16.175 19 18.404 19 15.333 24 18.474 29 16.123 29 14.013 25.07 11.912 29 9.526 29 12.719 23.982z"></path>
                                </svg>
                                Balance
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className={`${card} p-4 space-y-4`}>

                {/* Filtros */}
                <Suspense fallback={<Loader />}>
                    <FiltrosAlumnos
                        busqueda={busqueda}
                        setBusqueda={setBusqueda}
                        filtroPago={filtroPago}
                        setFiltroPago={setFiltroPago}
                        ordenDiasRestantes={ordenDiasRestantes}
                        setOrdenDiasRestantes={setOrdenDiasRestantes}
                        filtroDiasEntrena={filtroDiasEntrena}
                        setFiltroDiasEntrena={setFiltroDiasEntrena}
                        diasDisponibles={[...Array.from(new Set(alumnos.map((a) => a.diasEntrenaSemana)))].filter(Boolean).sort((a, b) => a - b)}
                        limpiarFiltros={() => {
                            setBusqueda('');
                            setFiltroPago('');
                            setOrdenDiasRestantes('');
                            setFiltroDiasEntrena('');
                        }}
                    />
                </Suspense>

                {/* Lista */}
                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
                        ))}
                    </div>
                ) : alumnosFiltrados.length === 0 ? (
                    <div className="py-14 text-center">
                        <p className="text-slate-400 text-sm font-medium">No se encontraron alumnos</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            {paginatedAlumnos.map((alumno) => {
                                const pagado = verificarPagoMesActual(alumno.pagos);
                                const dr = alumno.diasRestantes;
                                const planText = dr != null
                                    ? `${dr} día${dr !== 1 ? 's' : ''} de plan`
                                    : 'Sin plan';
                                const planColor = dr == null
                                    ? 'text-red-400'
                                    : dr === 0
                                        ? 'text-red-500'
                                        : dr <= 5
                                            ? 'text-amber-500'
                                            : 'text-slate-400';
                                return (
                                    <div
                                        key={alumno._id}
                                        className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 active:scale-[0.99] cursor-pointer transition-all"
                                        onClick={() => setAlumnoSeleccionado(alumno)}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold ${pagado ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                            {alumno.nombre?.[0]}{alumno.apellido?.[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-800 text-sm truncate">
                                                {alumno.apellido}, {alumno.nombre}
                                            </p>
                                            <p className={`text-xs mt-0.5 ${planColor}`}>
                                                {alumno.edad ? `${alumno.edad} años · ` : ''}{planText}
                                            </p>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-2">
                                            {pagado ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                                                    </svg>
                                                    Pagó
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
                                                    </svg>
                                                    Debe
                                                </span>
                                            )}
                                            <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                            </svg>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-center pt-2">
                            <Pagination
                                count={Math.ceil(alumnosFiltrados.length / itemsPerPage)}
                                page={page}
                                onChange={handlePageChange}
                                color="primary"
                            />
                        </div>
                    </>
                )}

                {editandoAlumno && (
                    <Suspense fallback={<Loader />}>
                        <ModalEditAlumno
                            alumno={editandoAlumno}
                            onClose={() => setEditandoAlumno(null)}
                            onSave={guardarAlumno}
                        />
                    </Suspense>
                )}

                {editandoTarifas && (
                    <Suspense fallback={<Loader />}>
                        <ModalEditTarifas
                            tarifas={tarifas}
                            onClose={() => setEditandoTarifas(false)}
                            onSave={guardarTarifas}
                        />
                    </Suspense>
                )}

            </div>

            {/* Modal detalle alumno */}
            <Modal
                isOpen={!!alumnoSeleccionado}
                onRequestClose={() => setAlumnoSeleccionado(null)}
                contentLabel="Detalle del Alumno"
                className="relative w-full max-w-sm mx-auto mt-12 outline-none"
                overlayClassName="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-start z-50 px-4 overflow-y-auto pb-8"
            >
                {alumnoSeleccionado && (() => {
                    const pagado = verificarPagoMesActual(alumnoSeleccionado.pagos);
                    const areaLabel: Record<string, string> = { salud: '❤️ Salud', fitness: '💪 Fitness', rendimiento: '🏅 Rendimiento', formacion: '🌱 Formación' };
                    const nivelLabel: Record<string, string> = { nunca: 'Primera vez', alguna_vez: 'Entrenó antes', hace_tiempo: 'Continuo' };
                    const initials = `${alumnoSeleccionado.nombre?.[0] ?? ''}${alumnoSeleccionado.apellido?.[0] ?? ''}`.toUpperCase();
                    return (
                        <div className="relative bg-white shadow-2xl rounded-3xl overflow-hidden outline-none">
                            {/* Header tipo documento */}
                            <div className="bg-[#111] px-5 pt-5 pb-4">
                                <button
                                    onClick={() => setAlumnoSeleccionado(null)}
                                    className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                                    aria-label="Cerrar"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                                        <span className="text-white font-bold text-lg">{initials}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-white font-bold text-base leading-tight truncate">
                                            {alumnoSeleccionado.apellido}, {alumnoSeleccionado.nombre}
                                        </p>
                                        <p className="text-slate-400 text-xs mt-0.5">DNI {alumnoSeleccionado.dni}</p>
                                    </div>
                                    <span className={`ml-auto shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${pagado ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {pagado ? 'Pagó' : 'Debe'}
                                    </span>
                                </div>
                            </div>

                            {/* Datos compactos */}
                            <div className="px-4 py-3 grid grid-cols-2 gap-2 border-b border-slate-100">
                                {[
                                    ['Edad', alumnoSeleccionado.edad ? `${alumnoSeleccionado.edad} años` : '-'],
                                    ['Teléfono', alumnoSeleccionado.telefono || '-'],
                                    ['Horario', capitalizar(alumnoSeleccionado.horarioEntrenamiento)],
                                    ['Días/sem', alumnoSeleccionado.diasEntrenaSemana ? `${alumnoSeleccionado.diasEntrenaSemana} días` : '-'],
                                    ...(alumnoSeleccionado.area ? [['Área', areaLabel[alumnoSeleccionado.area] ?? alumnoSeleccionado.area]] : []),
                                    ...(alumnoSeleccionado.nivelExperiencia ? [['Nivel', nivelLabel[alumnoSeleccionado.nivelExperiencia] ?? alumnoSeleccionado.nivelExperiencia]] : []),
                                    ...(alumnoSeleccionado.patologias ? [['Patologías', alumnoSeleccionado.patologias]] : []),
                                ].map(([label, value]) => (
                                    <div key={label} className={`bg-slate-50 rounded-xl px-3 py-2 ${label === 'Patologías' ? 'col-span-2' : ''}`}>
                                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
                                        <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Botones de acción */}
                            <div className="p-4 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => router.push(`/alumnos/${alumnoSeleccionado._id}/historial`)}
                                        className="flex flex-col items-center justify-center gap-1 py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-2xl transition-all active:scale-95"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                        </svg>
                                        Historial
                                    </button>
                                    <button
                                        onClick={() => marcarPagoMes(alumnoSeleccionado._id)}
                                        className="flex flex-col items-center justify-center gap-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-2xl transition-all active:scale-95"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75" />
                                        </svg>
                                        Marcar Pago
                                    </button>
                                    <button
                                        onClick={() => iniciarPlan(alumnoSeleccionado._id)}
                                        className="flex flex-col items-center justify-center gap-1 py-3 bg-amber-500 hover:bg-amber-400 text-white text-xs font-semibold rounded-2xl transition-all active:scale-95"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                                        </svg>
                                        Iniciar Plan
                                    </button>
                                    <button
                                        onClick={() => handleEditarAlumno(alumnoSeleccionado)}
                                        className="flex flex-col items-center justify-center gap-1 py-3 bg-[#111] hover:bg-zinc-800 text-white text-xs font-semibold rounded-2xl transition-all active:scale-95"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                                        </svg>
                                        Editar
                                    </button>
                                </div>
                                {['dueño', 'admin'].includes(session?.user?.role ?? '') && (
                                    <button
                                        onClick={() => handleResetPassword(alumnoSeleccionado)}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-2xl transition-all active:scale-95"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" />
                                        </svg>
                                        Resetear contraseña
                                    </button>
                                )}
                                <button
                                    onClick={() => eliminarAlumno(alumnoSeleccionado._id)}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-2xl transition-all active:scale-95"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                    </svg>
                                    Eliminar alumno
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </Modal>
        </div>
    );
}
