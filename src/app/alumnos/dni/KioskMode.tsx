'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { signOut } from 'next-auth/react';

const swalKiosk = {
    customClass: {
        popup: 'swal-dni-alert',
        confirmButton: 'sg-btn sg-btn-danger',
        cancelButton: 'sg-btn sg-btn-cancel',
    },
    buttonsStyling: false,
    backdrop: 'rgba(0,0,0,0.75)',
};

export interface KioskModeHandle {
    logoTap: () => void;
}

interface KioskModeProps {
    logoUrl: string | null;
    gymNombre: string;
    acento: string;
    acento2: string;
}

const KioskMode = forwardRef<KioskModeHandle, KioskModeProps>(
    ({ logoUrl, gymNombre, acento, acento2 }, ref) => {
        const [started, setStarted] = useState(false);
        const [isFullscreen, setIsFullscreen] = useState(false);
        const tapCount = useRef(0);
        const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

        useEffect(() => {
            const onChange = () => {
                const fs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
                setIsFullscreen(fs);
            };
            document.addEventListener('fullscreenchange', onChange);
            document.addEventListener('webkitfullscreenchange', onChange);
            return () => {
                document.removeEventListener('fullscreenchange', onChange);
                document.removeEventListener('webkitfullscreenchange', onChange);
            };
        }, []);

        const requestFs = () => {
            const el = document.documentElement as any;
            const opts = { navigationUI: 'hide' as const };
            // Try standard API first, then webkit prefix (Samsung Internet older)
            const p: Promise<void> | undefined =
                el.requestFullscreen ? el.requestFullscreen(opts)
                : el.webkitRequestFullscreen ? el.webkitRequestFullscreen(opts)
                : el.mozRequestFullScreen ? el.mozRequestFullScreen()
                : undefined;
            p?.catch(() => {});
        };

        const handleStart = () => {
            // Call requestFs synchronously inside the click handler so the browser
            // treats it as a direct user gesture (required by Chrome / Samsung Internet)
            requestFs();
            setStarted(true);
        };

        useImperativeHandle(ref, () => ({
            logoTap: () => {
                tapCount.current += 1;
                if (tapTimer.current) clearTimeout(tapTimer.current);
                if (tapCount.current >= 5) {
                    tapCount.current = 0;
                    showExitModal();
                    return;
                }
                tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 2500);
            },
        }));

        const showExitModal = async () => {
            const { value: password, isConfirmed } = await Swal.fire({
                ...swalKiosk,
                title: 'Salir del terminal',
                input: 'password',
                inputLabel: 'Contraseña administrativa',
                inputPlaceholder: '••••••••',
                inputAttributes: { autocomplete: 'current-password' },
                showCancelButton: true,
                confirmButtonText: 'Salir',
                cancelButtonText: 'Cancelar',
            });
            if (!isConfirmed || !password) return;
            try {
                const res = await fetch('/api/auth/verify-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password }),
                });
                const { ok } = await res.json();
                if (!ok) {
                    Swal.fire({ ...swalKiosk, icon: 'error', title: 'Contraseña incorrecta', text: 'No se pudo salir del terminal.' });
                    return;
                }
            } catch {
                Swal.fire({ ...swalKiosk, icon: 'error', title: 'Error', text: 'No se pudo verificar la contraseña.' });
                return;
            }
            const inFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
            if (inFs) {
                try {
                    await (document.exitFullscreen?.() ?? (document as any).webkitExitFullscreen?.());
                } catch {}
            }
            signOut();
        };

        // — "INICIAR TERMINAL" screen —
        if (!started) {
            return (
                <div
                    className="absolute inset-0 z-[100] flex flex-col items-center justify-center gap-10"
                    style={{ background: '#111', userSelect: 'none' }}
                >
                    {/* Gym logo / name */}
                    <div className="flex items-center justify-center" style={{ height: 110 }}>
                        {logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={logoUrl}
                                alt={gymNombre || 'Gimnasio'}
                                style={{ maxHeight: 110, maxWidth: '70vw', objectFit: 'contain' }}
                                draggable={false}
                            />
                        ) : (
                            <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.75rem', letterSpacing: '-0.02em' }}>
                                {gymNombre}
                            </span>
                        )}
                    </div>

                    {/* Start button */}
                    <button
                        onClick={handleStart}
                        className="active:scale-95 transition-transform"
                        style={{
                            background: acento2 || acento,
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: '1.15rem',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            padding: '1.1rem 3rem',
                            borderRadius: '1rem',
                            border: 'none',
                            boxShadow: `0 4px 24px ${(acento2 || acento)}55`,
                            cursor: 'pointer',
                            minWidth: 260,
                        }}
                    >
                        Iniciar Terminal
                    </button>

                    <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Terminal de ingreso
                    </p>
                </div>
            );
        }

        // — "VOLVER A PANTALLA COMPLETA" banner —
        if (!isFullscreen) {
            return (
                <div
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[100]"
                    style={{ pointerEvents: 'auto' }}
                >
                    <button
                        onClick={requestFs}
                        className="active:scale-95 transition-transform"
                        style={{
                            background: 'rgba(255,255,255,0.10)',
                            border: '1px solid rgba(255,255,255,0.18)',
                            color: 'rgba(255,255,255,0.75)',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            padding: '0.65rem 1.5rem',
                            borderRadius: '999px',
                            cursor: 'pointer',
                            backdropFilter: 'blur(8px)',
                        }}
                    >
                        ▶ Volver a pantalla completa
                    </button>
                </div>
            );
        }

        return null;
    }
);

KioskMode.displayName = 'KioskMode';
export default KioskMode;
