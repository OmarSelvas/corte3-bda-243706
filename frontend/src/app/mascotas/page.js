'use client';
import { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import { api, getSessionData } from '../../lib/api';

export default function MascotasPage() {
  const [search,   setSearch]   = useState('');
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [session,  setSession]  = useState(null);
  const [queried,  setQueried]  = useState(false);

  useEffect(() => { setSession(getSessionData()); }, []);

  async function handleSearch(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setQueried(true);
    try {
      const data = await api.get(`/api/mascotas?search=${encodeURIComponent(search)}`);
      setResults(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout>
      <h1>Buscar Mascotas</h1>
      <p className="subtitle">
        {session?.rol === 'vet'
          ? '⚡ RLS activo — solo verás las mascotas que tienes asignadas'
          : 'Búsqueda en todas las mascotas de la clínica'}
      </p>

      {/* Panel de demostración de SQLi */}
      <div className="alert alert-info" style={{ marginBottom: '24px' }}>
        <strong>ZONA DE PRUEBA SQLI</strong> — Este campo es la superficie del cuaderno de ataques.
        Intenta: <code style={{ fontFamily: 'var(--mono)' }}>
          ' OR '1'='1
        </code> o <code style={{ fontFamily: 'var(--mono)' }}>
          '; DROP TABLE mascotas; --
        </code>. El backend los neutraliza con queries parametrizadas.
      </div>

      {/* Buscador */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <div style={{ flex: 1 }}>
          <input
            type="text"
            placeholder="Nombre o especie de la mascota..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-primary" type="submit">
          Buscar
        </button>
        <button
          className="btn-secondary"
          type="button"
          onClick={() => { setSearch(''); setResults([]); setQueried(false); }}
        >
          Limpiar
        </button>
      </form>

      {/* Hint de defensa */}
      {search && (
        <div style={{
          marginBottom: '16px', padding: '10px 14px',
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', fontFamily: 'var(--mono)', fontSize: '12px',
        }}>
          <span style={{ color: 'var(--text-muted)' }}>Query enviada al backend: </span>
          <span style={{ color: 'var(--accent)' }}>
            SELECT ... WHERE nombre ILIKE <strong>$1</strong>
          </span>
          <span style={{ color: 'var(--text-muted)' }}> — el valor </span>
          <span style={{ color: 'var(--warn)' }}>"{search}"</span>
          <span style={{ color: 'var(--text-muted)' }}> va como parámetro de protocolo, nunca interpolado</span>
        </div>
      )}

      {/* Resultados */}
      {loading && <div className="spinner" />}
      {error   && <div className="alert alert-error">{error}</div>}

      {!loading && queried && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0 }}>
              {results.length} resultado{results.length !== 1 ? 's' : ''}
            </h2>
            {session?.rol === 'vet' && (
              <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>
                RLS: filtrado por vet_id = {session.vetId}
              </span>
            )}
          </div>

          {results.length === 0 ? (
            <div className="empty">No se encontraron mascotas</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Especie</th>
                  <th>Nacimiento</th>
                  <th>Dueño</th>
                  <th>Teléfono</th>
                </tr>
              </thead>
              <tbody>
                {results.map(m => (
                  <tr key={m.id}>
                    <td style={{ color: 'var(--text-muted)' }}>#{m.id}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)' }}>{m.nombre}</td>
                    <td>{m.especie}</td>
                    <td>{m.fecha_nacimiento ? new Date(m.fecha_nacimiento).toLocaleDateString('es-MX') : '—'}</td>
                    <td>{m.dueno}</td>
                    <td>{m.telefono}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!queried && (
        <div className="empty" style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
          Escribe algo en el buscador para ver mascotas
        </div>
      )}
    </AppLayout>
  );
}