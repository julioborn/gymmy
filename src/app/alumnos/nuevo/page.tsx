'use client';
import AlumnoRegistroForm from '@/components/AlumnoRegistroForm';

export default function NuevoAlumnoPage() {
    return (
        <div className="max-w-4xl mx-auto pt-4 pb-12 px-4 space-y-4">

            <div className="relative rounded-3xl px-6 pt-6 pb-5 flex items-center gap-4 overflow-hidden"
                style={{ background: 'linear-gradient(165deg, rgba(16,185,129,0.1), rgba(17,17,17,0.9))', border: '1px solid rgba(16,185,129,0.3)', boxShadow: '0 0 0 1px rgba(16,185,129,0.05) inset, 0 10px 28px -9px rgba(16,185,129,0.3)' }}>
                <div className="pointer-events-none absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-20" style={{ background: '#10b981' }} />
                <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #10b981, #84cc16)' }}>
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                    </svg>
                </div>
                <div className="relative">
                    <h1 className="text-lg font-bold text-white leading-tight">Registrar Alumno</h1>
                    <p className="text-white/40 text-xs mt-0.5">Completá los datos del nuevo miembro</p>
                </div>
            </div>

            <AlumnoRegistroForm endpoint="/api/alumnos" />

        </div>
    );
}
