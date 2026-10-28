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

const Chevron = () => (
    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);

const selectCls = "w-full appearance-none bg-white/[0.08] text-white/80 text-xs font-semibold rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-1 focus:ring-white/20 cursor-pointer border border-white/[0.1]";
const labelCls = "block text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1 pl-0.5";

export default function FiltrosAlumnos({
    busqueda,
    setBusqueda,
    filtroPago,
    setFiltroPago,
    ordenDiasRestantes,
    setOrdenDiasRestantes,
    filtroDiasEntrena,
    setFiltroDiasEntrena,
    diasDisponibles,
    filtroArea,
    setFiltroArea,
    limpiarFiltros,
}: FiltrosProps) {
    const hayFiltros = busqueda || filtroPago || ordenDiasRestantes || filtroDiasEntrena || filtroArea;

    return (
        <div className="space-y-3 mb-2">

            {/* Búsqueda */}
            <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <input
                    type="text"
                    placeholder="Buscar por nombre, apellido o documento..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 bg-white/[0.07] border border-white/[0.1] rounded-2xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/25 transition-colors"
                />
                {busqueda && (
                    <button
                        onClick={() => setBusqueda('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Selects con label arriba */}
            <div className="flex gap-2 items-end">

                <div className="flex-1">
                    <label className={labelCls}>Pago</label>
                    <div className="relative">
                        <select value={filtroPago} onChange={(e) => setFiltroPago(e.target.value)} className={selectCls}>
                            <option value="" disabled hidden></option>
                            <option value="pagado">Pagaron</option>
                            <option value="no-pagado">Deben</option>
                        </select>
                        <Chevron />
                    </div>
                </div>

                <div className="flex-1">
                    <label className={labelCls}>Plan</label>
                    <div className="relative">
                        <select value={ordenDiasRestantes} onChange={(e) => setOrdenDiasRestantes(e.target.value)} className={selectCls}>
                            <option value="" disabled hidden></option>
                            <option value="asc">Plan ↑</option>
                            <option value="desc">Plan ↓</option>
                        </select>
                        <Chevron />
                    </div>
                </div>

                {diasDisponibles.length > 0 && (
                    <div className="flex-1">
                        <label className={labelCls}>Días/sem</label>
                        <div className="relative">
                            <select value={filtroDiasEntrena} onChange={(e) => setFiltroDiasEntrena(e.target.value)} className={selectCls}>
                                <option value="" disabled hidden></option>
                                {diasDisponibles.map((d) => (
                                    <option key={d} value={d}>{d} días</option>
                                ))}
                            </select>
                            <Chevron />
                        </div>
                    </div>
                )}

                <div className="flex-1">
                    <label className={labelCls}>Área</label>
                    <div className="relative">
                        <select value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)} className={selectCls}>
                            <option value="" disabled hidden></option>
                            <option value="fuerza">💪 Fuerza</option>
                            <option value="masa_muscular">🏋️ Masa musc.</option>
                            <option value="salud">❤️ Salud</option>
                            <option value="composicion">⚖️ Composición</option>
                            <option value="rendimiento">🏅 Rendimiento</option>
                            <option value="formacion">🌱 Formación</option>
                            <option value="retomar">🔄 Retomar</option>
                        </select>
                        <Chevron />
                    </div>
                </div>

                {hayFiltros && (
                    <button
                        onClick={limpiarFiltros}
                        className="text-xs font-semibold text-white/40 hover:text-white/70 transition-colors whitespace-nowrap px-1 pb-2"
                    >
                        Limpiar
                    </button>
                )}
            </div>

        </div>
    );
}
