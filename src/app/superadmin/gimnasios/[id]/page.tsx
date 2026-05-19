'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Usuario {
    _id: string;
    username: string;
    role: string;
}

interface Gimnasio {
    _id: string;
    nombre: string;
    activo: boolean;
    fechaVencimiento?: string;
    totalAlumnos: number;
    usuarios: Usuario[];
    createdAt: string;
}

export default function GimnasioDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [gimnasio, setGimnasio] = useState<Gimnasio | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [editNombre, setEditNombre] = useState('');
    const [editFechaVencimiento, setEditFechaVencimiento] = useState('');

    const [nuevoUser, setNuevoUser] = useState({ username: '', password: '', role: 'registro' });
    const [userError, setUserError] = useState('');
    const [addingUser, setAddingUser] = useState(false);

    useEffect(() => {
        fetchGimnasio();
    }, [id]);

    async function fetchGimnasio() {
        setLoading(true);
        const res = await fetch(`/api/superadmin/gimnasios/${id}`);
        if (res.ok) {
            const data = await res.json();
            setGimnasio(data);
            setEditNombre(data.nombre);
            setEditFechaVencimiento(
                data.fechaVencimiento
                    ? new Date(data.fechaVencimiento).toISOString().split('T')[0]
                    : ''
            );
        }
        setLoading(false);
    }

    async function handleGuardar() {
        setSaving(true);
        await fetch(`/api/superadmin/gimnasios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: editNombre,
                fechaVencimiento: editFechaVencimiento || null,
            }),
        });
        await fetchGimnasio();
        setSaving(false);
    }

    async function toggleActivo() {
        if (!gimnasio) return;
        await fetch(`/api/superadmin/gimnasios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activo: !gimnasio.activo }),
        });
        fetchGimnasio();
    }

    async function handleAddUser(e: React.FormEvent) {
        e.preventDefault();
        setUserError('');
        setAddingUser(true);
        try {
            const res = await fetch('/api/superadmin/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...nuevoUser, gimnasioId: id }),
            });
            const data = await res.json();
            if (!res.ok) {
                setUserError(data.error || 'Error al crear usuario');
            } else {
                setNuevoUser({ username: '', password: '', role: 'registro' });
                fetchGimnasio();
            }
        } finally {
            setAddingUser(false);
        }
    }

    async function handleDeleteUser(userId: string) {
        if (!confirm('¿Eliminar este usuario?')) return;
        await fetch(`/api/superadmin/usuarios/${userId}`, { method: 'DELETE' });
        fetchGimnasio();
    }

    if (loading) return <div className="text-slate-400 text-center py-16">Cargando...</div>;
    if (!gimnasio) return <div className="text-red-400 text-center py-16">Gimnasio no encontrado</div>;

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
            <div className="flex items-center justify-between">
                <Link href="/superadmin" className="text-slate-400 hover:text-slate-200 text-sm">
                    ← Volver
                </Link>
                <button
                    onClick={toggleActivo}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                        gimnasio.activo
                            ? 'bg-red-900/40 hover:bg-red-900/70 text-red-400'
                            : 'bg-emerald-900/40 hover:bg-emerald-900/70 text-emerald-400'
                    }`}
                >
                    {gimnasio.activo ? 'Desactivar acceso' : 'Activar acceso'}
                </button>
            </div>

            {/* Info del gimnasio */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
                <h2 className="text-white font-bold text-lg">Datos del gimnasio</h2>

                <div className="grid gap-3">
                    <div>
                        <label className="block text-slate-400 text-xs mb-1">Nombre</label>
                        <input
                            value={editNombre}
                            onChange={e => setEditNombre(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-400 text-xs mb-1">Fecha de vencimiento</label>
                        <input
                            type="date"
                            value={editFechaVencimiento}
                            onChange={e => setEditFechaVencimiento(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                    <span className="text-slate-400 text-sm">{gimnasio.totalAlumnos} alumnos registrados</span>
                    <button
                        onClick={handleGuardar}
                        disabled={saving}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                    >
                        {saving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </div>
            </div>

            {/* Usuarios del gimnasio */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
                <h2 className="text-white font-bold text-lg">Usuarios</h2>

                {gimnasio.usuarios.length === 0 ? (
                    <p className="text-slate-500 text-sm">Sin usuarios todavía.</p>
                ) : (
                    <div className="space-y-2">
                        {gimnasio.usuarios.map(u => (
                            <div key={u._id} className="flex items-center justify-between bg-slate-900 rounded-lg px-3 py-2">
                                <div>
                                    <span className="text-white text-sm font-medium">{u.username}</span>
                                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                                        u.role === 'admin'
                                            ? 'bg-emerald-900/50 text-emerald-400'
                                            : 'bg-slate-700 text-slate-400'
                                    }`}>
                                        {u.role}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleDeleteUser(u._id)}
                                    className="text-red-400 hover:text-red-300 text-xs"
                                >
                                    Eliminar
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Agregar usuario */}
                <form onSubmit={handleAddUser} className="border-t border-slate-700 pt-4 space-y-3">
                    <p className="text-slate-400 text-xs uppercase tracking-wide">Agregar usuario</p>

                    <div className="grid grid-cols-2 gap-3">
                        <input
                            placeholder="Username"
                            value={nuevoUser.username}
                            onChange={e => setNuevoUser(p => ({ ...p, username: e.target.value }))}
                            required
                            className="bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                        />
                        <input
                            placeholder="Contraseña"
                            type="password"
                            value={nuevoUser.password}
                            onChange={e => setNuevoUser(p => ({ ...p, password: e.target.value }))}
                            required
                            className="bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                        />
                    </div>

                    <select
                        value={nuevoUser.role}
                        onChange={e => setNuevoUser(p => ({ ...p, role: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    >
                        <option value="admin">Admin (acceso completo)</option>
                        <option value="registro">Registro (solo DNI)</option>
                    </select>

                    {userError && (
                        <p className="text-red-400 text-sm">{userError}</p>
                    )}

                    <button
                        type="submit"
                        disabled={addingUser}
                        className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                        {addingUser ? 'Agregando...' : 'Agregar usuario'}
                    </button>
                </form>
            </div>
        </div>
    );
}
