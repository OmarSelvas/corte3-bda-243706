'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveSession } from '../lib/api';

const VETS = [
  { id: 1, nombre: 'Dr. Fernando López Castro' },
  { id: 2, nombre: 'Dra. Sofía García Velasco' },
  { id: 3, nombre: 'Dr. Andrés Méndez Bravo' },
];

const ROLES = [
  { key: 'vet',       label: 'Veterinario',  desc: 'Solo ve sus mascotas asignadas (RLS activo)' },
  { key: 'recepcion', label: 'Recepción',     desc: 'Ve todas las mascotas y puede agendar citas' },
  { key: 'admin',     label: 'Administrador', desc: 'Acceso total al sistema' },
];

export default function LoginPage() {
  const router = useRouter();
  const [rol, setRol]     = useState('recepcion');
  const [vetId, setVetId] = useState(1);

  function handleLogin() {
    const session = {
      rol,
      vetId: rol === 'vet' ? vetId : null,
      nombre: rol === 'vet'
        ? VETS.find(v => v.id === vetId)?.nombre
        : rol === 'admin' ? 'Administrador' : 'Recepción',
    };
    saveSession(session);
    router.push('/mascotas');
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      zIndex: 1,
      padding: '24px',
    }}>
      {/* Glow de fondo */}
      <div style={{
        position: 'fixed',
        top: '30%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: '600px', height: '400px',
        background: 'radial-gradient(ellipse, rgba(0,212,170,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Logo */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{
            fontSize: '40px',
            marginBottom: '12px',
            filter: 'drop-shadow(0 0 20px rgba(0,212,170,0.5))',
          }}>🐾</div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Clínica Veterinaria
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Sistema de gestión · BDA Corte 3
          </p>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '20px', fontSize: '16px' }}>Selecciona tu rol</h2>

          {/* Selección de rol */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {ROLES.map(r => (
              <button
                key={r.key}
                onClick={() => setRol(r.key)}
                style={{
                  background: rol === r.key ? 'rgba(0,212,170,0.08)' : 'var(--surface2)',
                  border: rol === r.key ? '1px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'var(--text)',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>
                  {r.label}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'var(--mono)' }}>
                  {r.desc}
                </div>
              </button>
            ))}
          </div>

          {/* Selección de veterinario si rol = vet */}
          {rol === 'vet' && (
            <div className="field" style={{ marginBottom: '20px' }}>
              <label>Veterinario</label>
              <select value={vetId} onChange={e => setVetId(parseInt(e.target.value))}>
                {VETS.map(v => (
                  <option key={v.id} value={v.id}>{v.nombre}</option>
                ))}
              </select>
              <div style={{
                marginTop: '8px', fontSize: '11px', color: 'var(--accent)',
                fontFamily: 'var(--mono)',
              }}>
                ⚡ RLS activo — solo verás tus mascotas asignadas
              </div>
            </div>
          )}

          <button className="btn-primary" style={{ width: '100%' }} onClick={handleLogin}>
            Ingresar al sistema
          </button>
        </div>

        {/* Info de seguridad */}
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          fontSize: '11px',
          fontFamily: 'var(--mono)',
          color: 'var(--text-muted)',
          lineHeight: 1.8,
        }}>
          <div style={{ color: 'var(--accent)', marginBottom: '6px', fontWeight: 500 }}>
            CAPAS DE SEGURIDAD ACTIVAS
          </div>
          <div>✓ Queries parametrizadas (anti-SQLi)</div>
          <div>✓ Row-Level Security en PostgreSQL</div>
          <div>✓ GRANT/REVOKE por rol de BD</div>
          <div>✓ Caché Redis con invalidación</div>
        </div>
      </div>
    </div>
  );
}