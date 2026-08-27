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
    alias?: string;
    slug?: string;
    logoUrl?: string;
    logoHeaderUrl?: string;
    temaFondo?: string;
    temaAcento?: string;
    temaAcento2?: string;
    totalAlumnos: number;
    usuarios: Usuario[];
    createdAt: string;
}

interface EditUserState {
    username: string;
    role: string;
    password: string;
}

const ROLE_LABEL: Record<string, string> = {
    admin: 'Admin',
    dueño: 'Dueño',
    profesor: 'Profesor',
    registro: 'Registro',
};

export default function GimnasioDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [gimnasio, setGimnasio] = useState<Gimnasio | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [editNombre, setEditNombre] = useState('');
    const [editAlias, setEditAlias] = useState('');
    const [editSlug, setEditSlug] = useState('');
    const [editLogoUrl, setEditLogoUrl] = useState('');
    const [editLogoHeaderUrl, setEditLogoHeaderUrl] = useState('');
    const [editTemaFondo, setEditTemaFondo] = useState('');
    const [editTemaAcento, setEditTemaAcento] = useState('');
    const [editTemaAcento2, setEditTemaAcento2] = useState('');
    const [editFechaVencimiento, setEditFechaVencimiento] = useState('');

    const [nuevoUser, setNuevoUser] = useState({ username: '', password: '', role: 'registro' });
    const [userError, setUserError] = useState('');
    const [addingUser, setAddingUser] = useState(false);

    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editUser, setEditUser] = useState<EditUserState>({ username: '', role: '', password: '' });
    const [editUserError, setEditUserError] = useState('');
    const [savingUser, setSavingUser] = useState(false);

    useEffect(() => { fetchGimnasio(); }, [id]);

    async function fetchGimnasio() {
        setLoading(true);
        const res = await fetch(`/api/superadmin/gimnasios/${id}`);
        if (res.ok) {
            const data = await res.json();
            setGimnasio(data);
            setEditNombre(data.nombre);
            setEditAlias(data.alias ?? '');
            setEditSlug(data.slug ?? '');
            setEditLogoUrl(data.logoUrl ?? '');
            setEditLogoHeaderUrl(data.logoHeaderUrl ?? '');
            setEditTemaFondo(data.temaFondo ?? '');
            setEditTemaAcento(data.temaAcento ?? '');
            setEditTemaAcento2(data.temaAcento2 ?? '');
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
            body: JSON.stringify({ nombre: editNombre, alias: editAlias || null, slug: editSlug || null, logoUrl: editLogoUrl || null, logoHeaderUrl: editLogoHeaderUrl || null, temaFondo: editTemaFondo || null, temaAcento: editTemaAcento || null, temaAcento2: editTemaAcento2 || null, fechaVencimiento: editFechaVencimiento || null }),
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

    function startEditUser(u: Usuario) {
        setEditingUserId(u._id);
        setEditUser({ username: u.username, role: u.role, password: '' });
        setEditUserError('');
    }

    async function handleSaveUser(e: React.FormEvent) {
        e.preventDefault();
        setEditUserError('');
        setSavingUser(true);
        try {
            const res = await fetch(`/api/superadmin/usuarios/${editingUserId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: editUser.username,
                    role: editUser.role,
                    password: editUser.password || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setEditUserError(data.error || 'Error al guardar');
            } else {
                setEditingUserId(null);
                fetchGimnasio();
            }
        } finally {
            setSavingUser(false);
        }
    }

    async function handleDeleteUser(userId: string) {
        if (!confirm('¿Eliminar este usuario?')) return;
        await fetch(`/api/superadmin/usuarios/${userId}`, { method: 'DELETE' });
        fetchGimnasio();
    }

    if (loading) return <div className="text-slate-400 text-center py-16 text-sm">Cargando...</div>;
    if (!gimnasio) return <div className="text-slate-400 text-center py-16 text-sm">Gimnasio no encontrado.</div>;

    const vencido = gimnasio.fechaVencimiento && new Date(gimnasio.fechaVencimiento) < new Date();

    return (
        <div className="max-w-xl mx-auto py-6 px-4 space-y-4">

            {/* Nav */}
            <div className="flex items-center justify-between mb-2">
                <Link href="/superadmin" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                    Volver
                </Link>
                <button
                    onClick={toggleActivo}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] ${
                        gimnasio.activo
                            ? 'bg-red-50 text-red-500 hover:bg-red-100'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    }`}
                >
                    {gimnasio.activo ? 'Desactivar acceso' : 'Activar acceso'}
                </button>
            </div>

            {/* Datos del gimnasio */}
            <div className="bg-white rounded-2xl p-5 space-y-4">
                <h2 className="text-slate-800 font-bold text-base">Datos del gimnasio</h2>

                <div className="space-y-3">
                    <div>
                        <label className="block text-slate-500 text-xs font-medium mb-1.5">Nombre</label>
                        <input
                            value={editNombre}
                            onChange={e => setEditNombre(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-500 text-xs font-medium mb-1.5">Slug (URL de registro)</label>
                        <input
                            value={editSlug}
                            onChange={e => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            placeholder="ej: sporttime"
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />
                        {editSlug && (
                            <p className="text-slate-400 text-xs mt-1.5 pl-1">
                                gymmy.com.ar/registro/{editSlug}
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-slate-500 text-xs font-medium mb-1.5">Alias de MercadoPago</label>
                        <input
                            value={editAlias}
                            onChange={e => setEditAlias(e.target.value.trim())}
                            placeholder="ej: Bruno.gym.sporttime"
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-500 text-xs font-medium mb-1.5">Logo URL (formulario de registro)</label>
                        <input
                            value={editLogoUrl}
                            onChange={e => setEditLogoUrl(e.target.value.trim())}
                            placeholder="https://res.cloudinary.com/..."
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />
                        {editLogoUrl && (
                            <img src={editLogoUrl} alt="preview" style={{ height: 36, marginTop: 8, objectFit: 'contain', borderRadius: 6 }} />
                        )}
                    </div>
                    <div>
                        <label className="block text-slate-500 text-xs font-medium mb-1.5">Logo sin fondo URL (header de la app)</label>
                        <input
                            value={editLogoHeaderUrl}
                            onChange={e => setEditLogoHeaderUrl(e.target.value.trim())}
                            placeholder="https://res.cloudinary.com/... (PNG transparente)"
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />
                        {editLogoHeaderUrl && (
                            <div style={{ background: '#111', borderRadius: 8, padding: 8, marginTop: 8, display: 'inline-block' }}>
                                <img src={editLogoHeaderUrl} alt="preview header" style={{ height: 36, objectFit: 'contain' }} />
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-slate-500 text-xs font-medium mb-2">Tema de colores</label>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <p className="text-slate-400 text-xs mb-1">Fondo</p>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={editTemaFondo || '#0a0a0a'}
                                        onChange={e => setEditTemaFondo(e.target.value)}
                                        className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200" />
                                    <input value={editTemaFondo} onChange={e => setEditTemaFondo(e.target.value)}
                                        placeholder="#0a0a0a"
                                        className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
                                </div>
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs mb-1">Acento 1</p>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={editTemaAcento || '#10b981'}
                                        onChange={e => setEditTemaAcento(e.target.value)}
                                        className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200" />
                                    <input value={editTemaAcento} onChange={e => setEditTemaAcento(e.target.value)}
                                        placeholder="#10b981"
                                        className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
                                </div>
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs mb-1">Acento 2</p>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={editTemaAcento2 || '#10b981'}
                                        onChange={e => setEditTemaAcento2(e.target.value)}
                                        className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200" />
                                    <input value={editTemaAcento2} onChange={e => setEditTemaAcento2(e.target.value)}
                                        placeholder="opcional"
                                        className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
                                </div>
                            </div>
                        </div>
                        {(editTemaFondo || editTemaAcento || editTemaAcento2) && (
                            <div className="mt-2 rounded-xl px-4 py-2.5 flex items-center gap-3 text-white text-sm font-semibold"
                                style={{ background: editTemaFondo || '#0a0a0a' }}>
                                <span style={{ color: editTemaAcento || '#10b981' }}>●</span>
                                Preview tema
                                {editTemaAcento2 && <span style={{ color: editTemaAcento2 }}>●</span>}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-slate-500 text-xs font-medium mb-1.5">
                            Fecha de vencimiento
                            {vencido && <span className="ml-2 text-red-500 font-semibold">· Vencido</span>}
                        </label>
                        <input
                            type="date"
                            value={editFechaVencimiento}
                            onChange={e => setEditFechaVencimiento(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400 text-xs">{gimnasio.totalAlumnos} alumnos</span>
                    <button
                        onClick={handleGuardar}
                        disabled={saving}
                        className="bg-[#111] hover:bg-zinc-800 disabled:opacity-50 active:scale-[0.97] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    >
                        {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>

            {/* Usuarios */}
            <div className="bg-white rounded-2xl p-5 space-y-4">
                <h2 className="text-slate-800 font-bold text-base">Usuarios</h2>

                {gimnasio.usuarios.length === 0 ? (
                    <p className="text-slate-400 text-sm">Sin usuarios todavía.</p>
                ) : (
                    <div className="space-y-2">
                        {gimnasio.usuarios.map(u => (
                            <div key={u._id}>
                                {editingUserId === u._id ? (
                                    /* ── Formulario edición inline ── */
                                    <form onSubmit={handleSaveUser} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Editando usuario</p>
                                        <input
                                            value={editUser.username}
                                            onChange={e => setEditUser(p => ({ ...p, username: e.target.value }))}
                                            placeholder="Nombre de usuario"
                                            required
                                            className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                                        />
                                        <select
                                            value={editUser.role}
                                            onChange={e => setEditUser(p => ({ ...p, role: e.target.value }))}
                                            className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                                        >
                                            <option value="dueño">Dueño (acceso completo)</option>
                                            <option value="admin">Admin (acceso completo)</option>
                                            <option value="profesor">Profesor (sin finanzas)</option>
                                            <option value="registro">Registro (solo DNI)</option>
                                        </select>
                                        <input
                                            type="password"
                                            value={editUser.password}
                                            onChange={e => setEditUser(p => ({ ...p, password: e.target.value }))}
                                            placeholder="Nueva contraseña (dejar vacío para no cambiar)"
                                            className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                                        />
                                        {editUserError && <p className="text-red-500 text-xs">{editUserError}</p>}
                                        <div className="flex gap-2">
                                            <button
                                                type="submit"
                                                disabled={savingUser}
                                                className="flex-1 bg-[#111] hover:bg-zinc-800 disabled:opacity-50 text-white py-2 rounded-xl text-sm font-semibold transition-all"
                                            >
                                                {savingUser ? 'Guardando...' : 'Guardar'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditingUserId(null)}
                                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-xl text-sm font-semibold transition-all"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    /* ── Fila normal ── */
                                    <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-slate-800 text-sm font-medium">{u.username}</span>
                                            <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-200 text-slate-500 font-medium">
                                                {ROLE_LABEL[u.role] ?? u.role}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => startEditUser(u)}
                                                className="text-slate-400 hover:text-slate-700 text-xs font-medium transition-colors"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(u._id)}
                                                className="text-red-400 hover:text-red-600 text-xs font-medium transition-colors"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Agregar usuario */}
                <form onSubmit={handleAddUser} className="border-t border-slate-100 pt-4 space-y-3">
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Agregar usuario</p>
                    <input
                        placeholder="Nombre de usuario"
                        value={nuevoUser.username}
                        onChange={e => setNuevoUser(p => ({ ...p, username: e.target.value }))}
                        required
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                    <input
                        placeholder="Contraseña"
                        type="password"
                        value={nuevoUser.password}
                        onChange={e => setNuevoUser(p => ({ ...p, password: e.target.value }))}
                        required
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                    <select
                        value={nuevoUser.role}
                        onChange={e => setNuevoUser(p => ({ ...p, role: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    >
                        <option value="dueño">Dueño (acceso completo)</option>
                        <option value="admin">Admin (acceso completo)</option>
                        <option value="profesor">Profesor (sin finanzas)</option>
                        <option value="registro">Registro (solo DNI)</option>
                    </select>
                    {userError && <p className="text-red-500 text-xs">{userError}</p>}
                    <button
                        type="submit"
                        disabled={addingUser}
                        className="w-full bg-[#111] hover:bg-zinc-800 disabled:opacity-50 active:scale-[0.97] text-white py-2.5 rounded-xl text-sm font-semibold transition-all"
                    >
                        {addingUser ? 'Agregando...' : 'Agregar usuario'}
                    </button>
                </form>
            </div>
        </div>
    );
}
