export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;

    const cron = await import('node-cron');
    const { cronVencimientoCuotas, cronAusenciaProlongada } = await import('./lib/crons');

    // Vencimiento de cuota: todos los días a las 9am (solo actúa desde el día 24)
    cron.schedule('0 9 * * *', async () => {
        try { await cronVencimientoCuotas(); }
        catch (e) { console.error('[Cron] cuotas error:', e); }
    });

    // Ausencia prolongada: todos los lunes a las 9am
    cron.schedule('0 9 * * 1', async () => {
        try { await cronAusenciaProlongada(); }
        catch (e) { console.error('[Cron] ausencias error:', e); }
    });

    console.log('[Cron] jobs registrados');
}
