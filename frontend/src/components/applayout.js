'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSessionData, saveSession } from '../lib/api';

const NAV = [
  { href: '/mascotas',           label: 'Buscar Mascotas',      icon: '🔍', roles: ['vet','recepcion','admin'] },
  { href: '/vacunacion',         label: 'Vacunación Pendiente', icon: '💉', roles: ['vet','recepcion','admin'] },
  { href: '/citas',              label: 'Citas',                icon: '📅', roles: ['vet','recepcion','admin'] },
  { href: '/inventario',         label: 'Inventario',           icon: '📦', roles: ['admin'] },
];

export default function AppLayout({ children }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [session, setSession] = useState(null);

  useEffect(() => {
    const s = getSessionData();
    if (!s.rol) { router.push('/'); return; }
    setSession(s);
  }, []);

  function handleLogout() {
    saveSession({});
    router.push('/');
  }

  if (!session) return null;

  const visibleNav = NAV.filter(n => n.roles.includes(session.rol));

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          🐾 Clínica<br/>
          <span>Veterinaria</span>
        </div>

        {visibleNav.map(n => (
          <Link
            key={n.href}
            href={n.href}
            className={`nav-link ${pathname === n.href ? 'active' : ''}`}
          >
            <span>{n.icon}</span>
            {n.label}
          </Link>
        ))}

        {/* Info de sesión al fondo */}
        <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          <div className={`role-badge ${session.rol}`} style={{ marginBottom: '8px' }}>
            {session.rol}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--mono)', marginBottom: '10px' }}>
            {session.nombre}
          </div>
          <button className="btn-secondary" style={{ width: '100%', fontSize: '12px', padding: '7px' }} onClick={handleLogout}>
            Cambiar rol
          </button>
        </div>
      </aside>

      <main className="main">
        {children}
      </main>
    </div>
  );
}