'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
    const [recargo, setRecargo] = useState<number | null>(null);
    const router = useRouter();
    const [editandoTarifas, setEditandoTarifas] = useState(false);
    const [page, setPage] = useState(1); // Página actual
    const [itemsPerPage] = useState(10); // Cantidad de elementos por página
    const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<any | null>(null);
    const [filtroDiasEntrena, setFiltroDiasEntrena] = useState('');

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
    }, []);

    const fetchTarifas = async () => {
        try {
            const response = await fetch('/api/tarifas');
            const data = await response.json();

            // ✔️ si data viene como { ok: true, tarifas: [...], recargo: 1000 }
            if (data.ok && Array.isArray(data.tarifas)) {
                setTarifas(data.tarifas);
                setRecargo(data.recargo || 0);
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
                    <input type="number" id="tarifa-${tarifa.dias}" class="swal2-input" value="${tarifa.valor}">
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
                        <label class="swal-form-label" style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;text-transform:none;font-size:0.85rem;color:#334155;">
                            <input type="checkbox" id="swal-aplicar-recargo" ${new Date().getDate() > 10 ? 'checked' : ''} style="width:16px;height:16px;accent-color:#059669;">
                            Aplicar recargo ($${recargo?.toFixed(2) || 0})
                        </label>
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

                    const montoRecargo = aplicarRecargo ? recargo || 0 : 0;
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
            setRecargo(data.monto || 0);
        } catch {
            // silenced
        }
    };

    const handleConfiguracionRecargos = async () => {
        if (recargo === null) {
            await Swal.fire({ ...swalNotify, icon: 'error', title: 'No se encontró el valor del recargo. Por favor, recarga la página.' });
            return;
        }

        const { value: nuevoMonto } = await Swal.fire({
            ...swalBase,
            title: 'Configurar Recargo',
            input: 'number',
            inputLabel: 'Monto del recargo ($)',
            inputValue: recargo,
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value || Number(value) <= 0) return 'El monto debe ser un número mayor a 0';
                return null;
            },
            confirmButtonText: 'Aceptar',
            cancelButtonText: 'Cancelar',
        });

        if (nuevoMonto && Number(nuevoMonto) !== recargo) {
            try {
                const response = await fetch('/api/recargo', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ monto: Number(nuevoMonto) }),
                });

                if (response.ok) {
                    Swal.fire({ ...swalNotify, icon: 'success', title: 'Recargo actualizado' });
                    setRecargo(Number(nuevoMonto));
                } else {
                    Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo actualizar el recargo' });
                }
            } catch {
                Swal.fire({ ...swalNotify, icon: 'error', title: 'Ocurrió un problema al actualizar el recargo' });
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
                    new Date(asistencia.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
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

    function capitalizar(texto: string) {
        return texto ? texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase() : '-';
    }

    return (
        <div className="w-full max-w-full lg:max-w-6xl mx-auto space-y-4">

            {/* Header */}
            <div className="px-1 pt-1 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white tracking-tight">Alumnos</h1>
                {session?.user?.role === 'dueño' && (
                    <button
                        className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
                        onClick={handleGenerateExcel}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="16" height="16" viewBox="0 0 48 48">
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

            {/* Body */}
            <div className="bg-white rounded-2xl shadow-sm p-4 lg:p-6">

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

                {/* Config buttons */}
                <div className="flex gap-2 mb-4">
                    <button
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg border border-slate-200 transition-all duration-150"
                        onClick={handleConfiguracionTarifas}
                    >
                        Cuotas
                    </button>
                    <button
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg border border-slate-200 transition-all duration-150"
                        onClick={handleConfiguracionRecargos}
                    >
                        Recargo
                    </button>
                </div>

                {/* Tabla */}
                {isLoading ? (
                    <Loader />
                ) : (
                    <>
                        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-4 py-3 text-xs text-slate-500 font-bold uppercase tracking-wider">Apellido</th>
                                        <th className="px-4 py-3 text-xs text-slate-500 font-bold uppercase tracking-wider">Nombre</th>
                                        <th className="px-4 py-3 text-xs text-slate-500 font-bold uppercase tracking-wider">Edad</th>
                                        <th className="px-4 py-3 text-xs text-slate-500 font-bold uppercase tracking-wider">Pago</th>
                                        <th className="px-4 py-3 text-xs text-slate-500 font-bold uppercase tracking-wider">Plan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedAlumnos.map((alumno, idx) => {
                                        const pagado = verificarPagoMesActual(alumno.pagos);
                                        return (
                                            <tr
                                                key={alumno._id}
                                                className={`cursor-pointer transition-colors duration-150 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100`}
                                                onClick={() => setAlumnoSeleccionado(alumno)}
                                            >
                                                <td className="px-4 py-3 font-semibold text-slate-800">{alumno.apellido}</td>
                                                <td className="px-4 py-3 text-slate-700">{alumno.nombre}</td>
                                                <td className="px-4 py-3 text-slate-500">{alumno.edad ?? '-'}</td>
                                                <td className="px-4 py-3">
                                                    {pagado ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                                                            </svg>
                                                            Pagó
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
                                                            </svg>
                                                            Debe
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {alumno.diasRestantes != null ? (
                                                        <span className={`font-semibold text-sm ${alumno.diasRestantes === 0 ? 'text-red-600' : alumno.diasRestantes <= 5 ? 'text-amber-600' : 'text-slate-700'}`}>
                                                            {alumno.diasRestantes} días
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs font-medium text-red-500">Sin plan</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-center mt-5">
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
                className="relative w-full max-w-2xl mx-auto mt-16 outline-none"
                overlayClassName="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-start z-50 px-4 overflow-y-auto"
            >
                {alumnoSeleccionado && (
                    <div className="relative bg-white shadow-2xl rounded-2xl overflow-hidden outline-none">
                        {/* Header del modal */}
                        <div className="bg-slate-900 px-6 py-5">
                            <button
                                onClick={() => setAlumnoSeleccionado(null)}
                                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                                aria-label="Cerrar"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <h2 className="text-xl font-bold text-white">
                                {alumnoSeleccionado.nombre} {alumnoSeleccionado.apellido}
                            </h2>
                            <div className="mt-1">
                                {verificarPagoMesActual(alumnoSeleccionado.pagos) ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400">
                                        Pago al día
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400">
                                        Debe este mes
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Datos del alumno */}
                        <div className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700 mb-6">
                                {[
                                    ['DNI', alumnoSeleccionado.dni],
                                    ['Edad', alumnoSeleccionado.edad ?? '-'],
                                    ['Teléfono', alumnoSeleccionado.telefono || '-'],
                                    ['Email', alumnoSeleccionado.email || '-'],
                                    ['Fecha de inicio', alumnoSeleccionado.fechaInicio ? new Date(alumnoSeleccionado.fechaInicio).toLocaleDateString() : '-'],
                                    ['Franja horaria', capitalizar(alumnoSeleccionado.horarioEntrenamiento)],
                                    ['Hora de inicio', alumnoSeleccionado.horaExactaEntrenamiento || '-'],
                                    ['Historial deportivo', alumnoSeleccionado.historialDeportivo || '-'],
                                    ['Historial de vida', alumnoSeleccionado.historialDeVida || '-'],
                                    ['Objetivos', alumnoSeleccionado.objetivos || '-'],
                                    ['Patologías', alumnoSeleccionado.patologias || '-'],
                                ].map(([label, value]) => (
                                    <div key={label} className="bg-slate-50 rounded-lg px-3 py-2">
                                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-0.5">{label}</p>
                                        <p className="font-medium text-slate-800 truncate">{value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Botones de acción */}
                            <div className="flex flex-wrap gap-2 justify-center">
                                <button
                                    onClick={() => router.push(`/alumnos/${alumnoSeleccionado._id}/historial`)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold rounded-xl transition-all"
                                >
                                    Historial
                                </button>
                                <button
                                    onClick={() => marcarPagoMes(alumnoSeleccionado._id)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all"
                                >
                                    Marcar Pago
                                </button>
                                <button
                                    onClick={() => iniciarPlan(alumnoSeleccionado._id)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold rounded-xl transition-all"
                                >
                                    Iniciar Plan
                                </button>
                                <button
                                    onClick={() => handleEditarAlumno(alumnoSeleccionado)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                    </svg>
                                    Editar
                                </button>
                                <button
                                    onClick={() => eliminarAlumno(alumnoSeleccionado._id)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-all"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                                    </svg>
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
