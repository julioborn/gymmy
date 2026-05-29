'use client';

import React from 'react';

interface State { hasError: boolean }

export default class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    State
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        minHeight: '100vh',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#0f172a',
                        color: '#e2e8f0',
                        fontFamily: 'system-ui, sans-serif',
                        padding: '24px',
                        textAlign: 'center',
                        gap: '16px',
                    }}
                >
                    <p style={{ fontSize: '1rem', color: '#94a3b8' }}>
                        Ocurrió un error al cargar la aplicación.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            backgroundColor: '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '12px 28px',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        Reintentar
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
