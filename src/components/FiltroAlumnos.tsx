import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

type FiltrosProps = {
    busqueda: string;
    setBusqueda: (value: string) => void;
    filtroPago: string;
    setFiltroPago: (value: string) => void;
    ordenDiasRestantes: string;
    setOrdenDiasRestantes: (value: string) => void;
    filtroDiasEntrena: string;
    setFiltroDiasEntrena: (value: string) => void;
    diasDisponibles: number[];
    filtroArea: string;
    setFiltroArea: (value: string) => void;
    limpiarFiltros: () => void;
};

const AREAS: { value: string; label: string }[] = [
    { value: 'fuerza', label: '💪 Fuerza' },
    { value: 'masa_muscular', label: '🏋️ Masa musc.' },
    { value: 'salud', label: '❤️ Salud' },
    { value: 'composicion', label: '⚖️ Composición' },
    { value: 'rendimiento', label: '🏅 Rendimiento' },
    { value: 'formacion', label: '🌱 Formación' },
    { value: 'retomar', label: '🔄 Retomar' },
];

export default function FiltrosAlumnos({
    busqueda, setBusqueda,
    filtroPago, setFiltroPago,
    ordenDiasRestantes, setOrdenDiasRestantes,
    filtroDiasEntrena, setFiltroDiasEntrena,
    diasDisponibles,
    filtroArea, setFiltroArea,
    limpiarFiltros,
}: FiltrosProps) {
    const [open, setOpen] = useState(false);

    const activeCount = [filtroPago, ordenDiasRestantes, filtroDiasEntrena, filtroArea].filter(Boolean).length;

    const Pill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                active
                    ? 'bg-white text-black'
                    : 'bg-white/[0.08] border border-white/[0.12] text-white/65 hover:bg-white/[0.14]'
            }`}
        >
            {children}
        </button>
    );

    return (
        <div className="space-y-2.5 mb-1">
            {/* Búsqueda + toggle filtros */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Nombre, apellido o documento..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-10 pr-9 py-2.5 bg-white/[0.07] border border-white/[0.1] rounded-2xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/25 transition-colors"
                    />
                    {busqueda && (
                        <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                            <X size={15} />
                        </button>
                    )}
                </div>
                <button
                    onClick={() => setOpen(v => !v)}
                    className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 shrink-0 ${
                        open || activeCount > 0
                            ? 'bg-white text-black'
                            : 'bg-white/[0.08] border border-white/[0.12] text-white/65 hover:bg-white/[0.14]'
                    }`}
                >
                    <SlidersHorizontal size={14} />
                    {activeCount > 0 ? `${activeCount}` : 'Filtros'}
                </button>
            </div>

            {/* Panel de filtros colapsable */}
            {open && (
                <div className="bg-white/[0.05] border border-white/[0.1] rounded-2xl p-3.5 space-y-3">

                    {/* Pago */}
                    <div>
                        <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-2">Pago</p>
                        <div className="flex gap-1.5 flex-wrap">
                            <Pill active={filtroPago === ''} onClick={() => setFiltroPago('')}>Todos</Pill>
                            <Pill active={filtroPago === 'pagado'} onClick={() => setFiltroPago('pagado')}>Pagaron</Pill>
                            <Pill active={filtroPago === 'no-pagado'} onClick={() => setFiltroPago('no-pagado')}>Deben</Pill>
                        </div>
                    </div>

                    {/* Plan */}
                    <div>
                        <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-2">Orden por plan</p>
                        <div className="flex gap-1.5 flex-wrap">
                            <Pill active={ordenDiasRestantes === ''} onClick={() => setOrdenDiasRestantes('')}>Sin orden</Pill>
                            <Pill active={ordenDiasRestantes === 'asc'} onClick={() => setOrdenDiasRestantes('asc')}>Plan ↑</Pill>
                            <Pill active={ordenDiasRestantes === 'desc'} onClick={() => setOrdenDiasRestantes('desc')}>Plan ↓</Pill>
                        </div>
                    </div>

                    {/* Días/sem */}
                    {diasDisponibles.length > 0 && (
                        <div>
                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-2">Días / semana</p>
                            <div className="flex gap-1.5 flex-wrap">
                                <Pill active={filtroDiasEntrena === ''} onClick={() => setFiltroDiasEntrena('')}>Todos</Pill>
                                {diasDisponibles.map(d => (
                                    <Pill key={d} active={filtroDiasEntrena === String(d)} onClick={() => setFiltroDiasEntrena(String(d))}>{d}d/sem</Pill>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Área */}
                    <div>
                        <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-2">Área</p>
                        <div className="flex gap-1.5 flex-wrap">
                            <Pill active={filtroArea === ''} onClick={() => setFiltroArea('')}>Todas</Pill>
                            {AREAS.map(a => (
                                <Pill key={a.value} active={filtroArea === a.value} onClick={() => setFiltroArea(a.value)}>{a.label}</Pill>
                            ))}
                        </div>
                    </div>

                    {/* Limpiar */}
                    {activeCount > 0 && (
                        <button
                            onClick={() => { limpiarFiltros(); }}
                            className="w-full text-xs font-semibold text-white/40 hover:text-white/70 transition-colors pt-1 text-center"
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
