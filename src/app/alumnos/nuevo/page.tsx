'use client';
import AlumnoRegistroForm from '@/components/AlumnoRegistroForm';

export default function NuevoAlumnoPage() {
    return (
        <div className="max-w-4xl mx-auto pt-4 pb-12 px-4 space-y-4">

            <div className="bg-[#111] rounded-3xl px-6 pt-6 pb-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-emerald-500 rounded-2xl flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white leading-tight">Registrar Alumno</h1>
                    <p className="text-slate-400 text-xs mt-0.5">Completá los datos del nuevo miembro</p>
                </div>
            </div>

            <AlumnoRegistroForm endpoint="/api/alumnos" />

        </div>
    );
}
