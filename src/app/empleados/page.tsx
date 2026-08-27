'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { swalBase, swalDanger, swalNotify } from '@/utils/swalConfig';

type Empleado = {
    _id: string;
    username: string;
    role: string;
};

const ROLE_LABEL: Record<string, string> = {
    dueño: 'Dueño',
    admin: 'Admin',
    profesor: 'Profesor',
    registro: 'Registro',
};

const ROLE_BADGE: Record<string, string> = {
    dueño: 'bg-slate-700 text-white',
    admin: 'bg-slate-100 text-slate-700 border border-slate-200',
    profesor: 'bg-violet-100 text-violet-700 border border-violet-200',
    registro: 'bg-amber-100 text-amber-700 border border-amber-200',
};

const ROLE_AVATAR: Record<string, string> = {
    dueño: 'bg-slate-700',
    admin: 'bg-slate-800',
    profesor: 'bg-violet-500',
    registro: 'bg-amber-400',
};

function roleSelectOptions(selected?: string) {
    return [
        { value: 'admin', label: 'Admin — acceso completo' },
        { value: 'profesor', label: 'Profesor — sin finanzas ni estadísticas' },
        { value: 'registro', label: 'Registro — solo DNI' },
        { value: 'dueño', label: 'Dueño — acceso completo' },
    ]
        .map(
            ({ value, label }) =>
                `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`
        )
        .join('');
}

export default function EmpleadosPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [loading, setLoading] = useState(true);

    const myId = session?.user?.id;
    const myRole = session?.user?.role;
    const esDueño = myRole === 'dueño' || myRole === 'admin';

    useEffect(() => {
        if (status === 'unauthenticated') { router.push('/login'); return; }
        if (status !== 'authenticated') return;
        if (!esDueño) { router.push('/'); return; }
        cargar();
    }, [status, esDueño, router]);

    async function cargar() {
        setLoading(true);
        try {
            const r = await fetch('/api/empleados');
            const d = await r.json();
            setEmpleados(d.empleados || []);
        } catch { /* ignorar */ } finally {
            setLoading(false);
        }
    }

    async function handleAgregar() {
        const { value } = await Swal.fire({
            ...swalBase,
            title: 'Agregar empleado',
            html: `
                <div class="swal-form-body">
                    <div>
                        <label class="swal-form-label">Usuario</label>
                        <input id="emp-username" class="swal2-input" placeholder="nombre_usuario" autocomplete="off" />
                    </div>
                    <div>
                        <label class="swal-form-label">Contraseña</label>
                        <input id="emp-password" type="password" class="swal2-input" placeholder="Mínimo 6 caracteres" />
                    </div>
                    <div>
                        <label class="swal-form-label">Rol</label>
                        <select id="emp-role" class="swal2-input">${roleSelectOptions('admin')}</select>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Agregar',
            cancelButtonText: 'Cancelar',
            focusConfirm: false,
            preConfirm: () => {
                const username = (document.getElementById('emp-username') as HTMLInputElement)?.value?.trim();
                const password = (document.getElementById('emp-password') as HTMLInputElement)?.value;
                const role = (document.getElementById('emp-role') as HTMLSelectElement)?.value;
                if (!username || !password) {
                    Swal.showValidationMessage('Completá usuario y contraseña');
                    return false;
                }
                if (password.length < 6) {
                    Swal.showValidationMessage('La contraseña debe tener al menos 6 caracteres');
                    return false;
                }
                return { username, password, role };
            },
        });

        if (!value) return;

        try {
            const res = await fetch('/api/empleados', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(value),
            });
            const data = await res.json();
            if (!res.ok) {
                Swal.fire({ ...swalNotify, icon: 'error', title: data.error || 'No se pudo crear el empleado' });
                return;
            }
            Swal.fire({ ...swalNotify, icon: 'success', title: 'Empleado creado', showConfirmButton: false, timer: 1500 });
            cargar();
        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al crear el empleado' });
        }
    }

    async function handleEditar(emp: Empleado) {
        const { value } = await Swal.fire({
            ...swalBase,
            title: 'Editar empleado',
            html: `
                <div class="swal-form-body">
                    <div>
                        <label class="swal-form-label">Usuario</label>
                        <input id="edit-username" class="swal2-input" value="${emp.username}" autocomplete="off" />
                    </div>
                    <div>
                        <label class="swal-form-label">Contraseña nueva (opcional)</label>
                        <input id="edit-password" type="password" class="swal2-input" placeholder="Dejar vacío para no cambiar" />
                    </div>
                    <div>
                        <label class="swal-form-label">Rol</label>
                        <select id="edit-role" class="swal2-input">${roleSelectOptions(emp.role)}</select>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            focusConfirm: false,
            preConfirm: () => {
                const username = (document.getElementById('edit-username') as HTMLInputElement)?.value?.trim();
                const password = (document.getElementById('edit-password') as HTMLInputElement)?.value;
                const role = (document.getElementById('edit-role') as HTMLSelectElement)?.value;
                if (!username) {
                    Swal.showValidationMessage('El usuario no puede estar vacío');
                    return false;
                }
                if (password && password.length < 6) {
                    Swal.showValidationMessage('La contraseña debe tener al menos 6 caracteres');
                    return false;
                }
                return { username, role, ...(password ? { password } : {}) };
            },
        });

        if (!value) return;

        try {
            const res = await fetch(`/api/empleados/${emp._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(value),
            });
            const data = await res.json();
            if (!res.ok) {
                Swal.fire({ ...swalNotify, icon: 'error', title: data.error || 'No se pudo actualizar' });
                return;
            }
            Swal.fire({ ...swalNotify, icon: 'success', title: 'Empleado actualizado', showConfirmButton: false, timer: 1500 });
            cargar();
        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al actualizar' });
        }
    }

    async function handleEliminar(emp: Empleado) {
        const { isConfirmed } = await Swal.fire({
            ...swalDanger,
            title: `¿Eliminar a ${emp.username}?`,
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        });

        if (!isConfirmed) return;

        try {
            const res = await fetch(`/api/empleados/${emp._id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) {
                Swal.fire({ ...swalNotify, icon: 'error', title: data.error || 'No se pudo eliminar' });
                return;
            }
            Swal.fire({ ...swalNotify, icon: 'success', title: 'Empleado eliminado', showConfirmButton: false, timer: 1500 });
            cargar();
        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al eliminar' });
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-700" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pt-4 pb-12 px-4 space-y-4">

            {/* Banner */}
            <div className="bg-slate-900 rounded-3xl px-6 pt-6 pb-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-slate-800 rounded-2xl flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white leading-tight">Empleados</h1>
                        <p className="text-slate-400 text-xs mt-0.5">
                            {empleados.length} {empleados.length === 1 ? 'miembro' : 'miembros'} del equipo
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleAgregar}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white text-sm font-semibold rounded-2xl px-4 py-2.5 transition-colors shadow-sm shrink-0"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span>Agregar</span>
                </button>
            </div>

            {/* Lista */}
            {empleados.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-10 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                        </svg>
                    </div>
                    <p className="text-slate-600 font-semibold text-sm">Sin empleados registrados</p>
                    <p className="text-slate-400 text-xs mt-1">Tocá &quot;Agregar&quot; para añadir el primer miembro del equipo.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {empleados.map(emp => {
                        const isMe = emp._id === myId;
                        const initials = emp.username.slice(0, 2).toUpperCase();
                        return (
                            <div
                                key={emp._id}
                                className="bg-white border border-slate-100 rounded-2xl shadow-sm px-4 py-3.5 flex items-center gap-3"
                            >
                                {/* Avatar */}
                                <div
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white text-xs font-bold ${ROLE_AVATAR[emp.role] ?? 'bg-slate-500'}`}
                                >
                                    {initials}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-slate-800 font-semibold text-sm">{emp.username}</span>
                                        {isMe && (
                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full leading-none">
                                                Vos
                                            </span>
                                        )}
                                    </div>
                                    <span
                                        className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-lg mt-1 ${ROLE_BADGE[emp.role] ?? 'bg-slate-100 text-slate-600'}`}
                                    >
                                        {ROLE_LABEL[emp.role] ?? emp.role}
                                    </span>
                                </div>

                                {/* Acciones */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        onClick={() => handleEditar(emp)}
                                        title="Editar"
                                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleEliminar(emp)}
                                        disabled={isMe}
                                        title={isMe ? 'No podés eliminar tu propia cuenta' : 'Eliminar'}
                                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 transition disabled:opacity-25 disabled:cursor-not-allowed"
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

        </div>
    );
}
