'use client';

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function capitalize(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

const NAV_CARDS = [
  {
    href: '/alumnos',
    label: 'Lista de Alumnos',
    desc: 'Ver y gestionar alumnos',
    cls: 'from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600',
    role: null as string | null,
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
  },
  {
    href: '/alumnos/nuevo',
    label: 'Registrar Alumno',
    desc: 'Añadir nuevo alumno',
    cls: 'from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600',
    role: null as string | null,
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
      </svg>
    ),
  },
  {
    href: '/alumnos/finanzas',
    label: 'Finanzas',
    desc: 'Control de ingresos',
    cls: 'from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500',
    role: 'dueño' as string | null,
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    href: '/alumnos/estadisticas',
    label: 'Estadísticas',
    desc: 'Métricas del gimnasio',
    cls: 'from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600',
    role: 'dueño' as string | null,
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
];

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user?.role === 'registro') {
      router.push('/alumnos/dni');
    }
  }, [session, router]);

  if (!session) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="bg-slate-800 border border-slate-700 p-10 rounded-2xl shadow-2xl text-center max-w-sm w-full">
          <svg className="w-14 h-14 mx-auto mb-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          <h1 className="text-3xl font-bold text-white mb-1">Gymmy</h1>
          <p className="text-slate-400 text-sm mb-8">Sistema de gestión</p>
          <button
            onClick={() => signIn()}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  const visibleCards = NAV_CARDS.filter(c => !c.role || c.role === session.user?.role);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-2">
            {getGreeting()}
          </p>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            {capitalize(session.user?.username ?? 'Usuario')}
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {visibleCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`bg-gradient-to-br ${card.cls} p-5 rounded-2xl text-white flex flex-col gap-3 transition-all duration-200 shadow-lg active:scale-[0.97]`}
            >
              <div className="opacity-90">{card.icon}</div>
              <div>
                <p className="font-bold text-sm leading-tight">{card.label}</p>
                <p className="text-xs opacity-60 mt-0.5">{card.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        <button
          onClick={() => signOut()}
          className="w-full py-3 bg-slate-800 hover:bg-red-700/80 text-slate-400 hover:text-white font-semibold rounded-xl transition-all duration-200 border border-slate-700 hover:border-red-600/50 flex items-center justify-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
          </svg>
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
