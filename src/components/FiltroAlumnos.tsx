import { useState } from 'react';
import { SlidersHorizontal, X, Search } from 'lucide-react';

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
    /** Color de acento para el borde en foco del buscador (tema del gym). Opcional. */
    acentoFocus?: string;
};

const SURFACE_2 = '#191A1C';
const SEARCH_BG = '#1C1D1F';
const BORDER = '#303236';
const TEXT_PRIMARY = '#F5F5F5';
const TEXT_SECONDARY = '#A1A1AA';
const TEXT_MUTED = '#71717A';

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
    acentoFocus = '#FF7A00',
}: FiltrosProps) {
    const [open, setOpen] = useState(false);
    const [focused, setFocused] = useState(false);

    const activeCount = [filtroPago, ordenDiasRestantes, filtroDiasEntrena, filtroArea].filter(Boolean).length;

    const Pill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
        <button
            onClick={onClick}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95"
            style={active
                ? { background: TEXT_PRIMARY, color: '#0a0a0a' }
                : { background: SURFACE_2, border: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}
        >
            {children}
        </button>
    );

    return (
        <div className="space-y-2.5 mb-1">
            {/* Búsqueda + toggle filtros */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: TEXT_MUTED }} />
                    <input
                        type="text"
                        placeholder="Nombre, apellido o documento..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        className="w-full pl-11 pr-9 py-3 rounded-[14px] text-sm transition-colors duration-200 focus:outline-none"
                        style={{
                            background: SEARCH_BG,
                            border: `1px solid ${focused ? acentoFocus : BORDER}`,
                            color: TEXT_PRIMARY,
                            boxShadow: focused ? `0 0 0 3px ${acentoFocus}1F` : 'none',
                        }}
                    />
                    {busqueda && (
                        <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: TEXT_MUTED }}>
                            <X size={15} />
                        </button>
                    )}
                </div>
                <button
                    onClick={() => setOpen(v => !v)}
                    className="flex items-center gap-1.5 px-3.5 py-3 rounded-[14px] text-xs font-bold transition-all duration-200 active:scale-95 shrink-0"
                    style={open || activeCount > 0
                        ? { background: TEXT_PRIMARY, color: '#0a0a0a' }
                        : { background: SEARCH_BG, border: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}
                    onMouseEnter={(e) => { if (!open && activeCount === 0) e.currentTarget.style.background = SURFACE_2; }}
                    onMouseLeave={(e) => { if (!open && activeCount === 0) e.currentTarget.style.background = SEARCH_BG; }}
                >
                    <SlidersHorizontal size={14} />
                    {activeCount > 0 ? `${activeCount}` : 'Filtros'}
                </button>
            </div>

            {/* Panel de filtros colapsable */}
            {open && (
                <div className="rounded-2xl p-3.5 space-y-3" style={{ background: SURFACE_2, border: `1px solid ${BORDER}` }}>

                    {/* Pago */}
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: TEXT_MUTED }}>Pago</p>
                        <div className="flex gap-1.5 flex-wrap">
                            <Pill active={filtroPago === ''} onClick={() => setFiltroPago('')}>Todos</Pill>
                            <Pill active={filtroPago === 'pagado'} onClick={() => setFiltroPago('pagado')}>Pagaron</Pill>
                            <Pill active={filtroPago === 'no-pagado'} onClick={() => setFiltroPago('no-pagado')}>Deben</Pill>
                        </div>
                    </div>

                    {/* Plan */}
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: TEXT_MUTED }}>Orden por plan</p>
                        <div className="flex gap-1.5 flex-wrap">
                            <Pill active={ordenDiasRestantes === ''} onClick={() => setOrdenDiasRestantes('')}>Sin orden</Pill>
                            <Pill active={ordenDiasRestantes === 'asc'} onClick={() => setOrdenDiasRestantes('asc')}>Plan ↑</Pill>
                            <Pill active={ordenDiasRestantes === 'desc'} onClick={() => setOrdenDiasRestantes('desc')}>Plan ↓</Pill>
                        </div>
                    </div>

                    {/* Días/sem */}
                    {diasDisponibles.length > 0 && (
                        <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: TEXT_MUTED }}>Días / semana</p>
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
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: TEXT_MUTED }}>Área</p>
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
                            className="w-full text-xs font-semibold transition-colors pt-1 text-center"
                            style={{ color: TEXT_MUTED }}
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
