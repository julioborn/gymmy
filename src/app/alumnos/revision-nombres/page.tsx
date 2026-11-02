'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Flagged = {
    _id: string;
    nombre: string;
    apellido: string;
    dni: string;
    problemasNombre: string[];
    problemasApellido: string[];
};

export default function RevisionNombresPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [data, setData] = useState<{ total: number; flagged: number; resultado: Flagged[] } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status !== 'loading' && !['dueño', 'admin'].includes(session?.user?.role ?? '')) {
            router.push('/');
        }
    }, [session, status, router]);

    useEffect(() => {
        fetch('/api/alumnos/revisar-nombres')
            .then(r => r.json())
            .then(d => { if (d.ok) setData(d); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="max-w-3xl mx-auto pt-4 pb-12 px-4 space-y-4">
            <div className="bg-[#111] rounded-3xl px-6 pt-6 pb-5">
                <h1 className="text-lg font-bold text-white leading-tight">Revisión de nombres</h1>
                <p className="text-slate-400 text-xs mt-0.5">
                    Nombres y apellidos con mayúscula/minúscula rara, espacios dobles, números u otros problemas de formato.
                </p>
                {data && (
                    <p className="text-slate-500 text-xs mt-2">
                        {data.flagged} de {data.total} alumnos con algo para revisar
                    </p>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-lime-400 animate-spin" />
                </div>
            ) : !data || data.resultado.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center">
                    <p className="text-slate-500 text-sm">No se encontraron nombres con problemas de formato.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {data.resultado.map(a => (
                        <Link
                            key={a._id}
                            href={`/alumnos/${a._id}/historial`}
                            className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-100 bg-white hover:border-slate-300 active:scale-[0.99] transition-all"
                        >
                            <div className="min-w-0">
                                <p className="font-semibold text-slate-800 text-sm truncate">
                                    {a.apellido || '—'}, {a.nombre || '—'}
                                </p>
                                <p className="text-slate-400 text-xs mt-0.5">DNI {a.dni}</p>
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                    {a.problemasNombre.map((p, i) => (
                                        <span key={`n-${i}`} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700">
                                            nombre: {p}
                                        </span>
                                    ))}
                                    {a.problemasApellido.map((p, i) => (
                                        <span key={`a-${i}`} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700">
                                            apellido: {p}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                            </svg>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
