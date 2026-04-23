'use client';
import { useState } from 'react';
import AppLayout from '../../components/AppLayout';
import { api } from '../../lib/api';

export default function VacunacionPage() {
  const [data,      setData]      = useState(null);
  const [source,    setSource]    = useState(null);
  const [latency,   setLatency]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [history,   setHistory]   = useState([]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    const t0 = performance.now();
    try {
      const res = await api.get('/api/vacunas/vacunacion-pendiente');
      const elapsed = Math.round(performance.now() - t0);
      setData(res.data);
      setSource(res.source);
      setLatency(res.latency_ms ?? elapsed);
      setHistory(h => [{
        ts:      new Date().toLocaleTimeString('es-MX'),
        source:  res.source,
        latency: res.latency_ms ?? elapsed,
        count:   res.data.length,
      }, ...h.slice(0, 9)]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout>
      <h1>Vacunación Pendiente</h1>
      <p className="subtitle">
        Mascotas sin vacuna en el último año — consulta cacheada en Redis
      </p>

      {/* Panel de demo de caché */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
              Demo de caché Redis
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
              Key: <code>vacunacion_pendiente</code> · TTL: 300s · Invalidación: al aplicar vacuna
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-primary" onClick={fetchData} disabled={loading}>
              {loading ? 'Consultando...' : 'Consultar'}
            </button>
          </div>
        </div>

        {/* Resultado de la última consulta */}
        {source && (
          <div style={{
            marginTop: '16px',
            padding: '14px',
            background: 'var(--surface2)',
            borderRadius: 'var(--radius)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}>
            <span className={`cache-badge ${source === 'cache' ? 'cache-hit' : 'cache-miss'}`}>
              {source === 'cache' ? '⚡ CACHE HIT' : '🔄 CACHE MISS'}
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '13px' }}>
              {latency != null ? `${latency}ms` : '—'}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              {source === 'cache'
                ? 'Datos servidos desde Redis (~5-20ms esperados)'
                : 'Datos consultados en PostgreSQL (~100-300ms esperados)'}
            </span>
          </div>
        )}
      </div>

      {/* Log de consultas */}
      {history.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '13px', marginBottom: '12px' }}>
            LOG DE CONSULTAS (últimas {history.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {history.map((h, i) => (
              <div key={i} style={{
                display: 'flex', gap: '16px', alignItems: 'center',
                fontFamily: 'var(--mono)', fontSize: '12px', padding: '6px 0',
                borderBottom: i < history.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{ color: 'var(--text-muted)', minWidth: '80px' }}>{h.ts}</span>
                <span className={`cache-badge ${h.source === 'cache' ? 'cache-hit' : 'cache-miss'}`}
                  style={{ minWidth: '110px', justifyContent: 'center' }}>
                  {h.source === 'cache' ? '⚡ HIT' : '🔄 MISS'}
                </span>
                <span style={{ color: 'var(--text)', minWidth: '60px' }}>{h.latency}ms</span>
                <span style={{ color: 'var(--text-muted)' }}>{h.count} mascotas</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <div className="spinner" />}

      {/* Tabla de resultados */}
      {data && !loading && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0 }}>
              {data.length} mascota{data.length !== 1 ? 's' : ''} con vacunación pendiente
            </h2>
          </div>

          {data.length === 0 ? (
            <div className="alert alert-success">
              ✓ Todas las mascotas están al día con sus vacunas
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Mascota</th>
                  <th>Especie</th>
                  <th>Dueño</th>
                  <th>Teléfono</th>
                  <th>Última vacuna</th>
                  <th>Días sin vacuna</th>
                </tr>
              </thead>
              <tbody>
                {data.map(m => (
                  <tr key={m.mascota_id}>
                    <td style={{ fontWeight: 600, fontFamily: 'var(--sans)', color: 'var(--text)' }}>
                      {m.mascota}
                    </td>
                    <td>{m.especie}</td>
                    <td>{m.dueno}</td>
                    <td>{m.telefono}</td>
                    <td style={{ color: m.ultima_vacuna ? 'var(--warn)' : 'var(--danger)' }}>
                      {m.ultima_vacuna
                        ? new Date(m.ultima_vacuna).toLocaleDateString('es-MX')
                        : 'Nunca vacunada'}
                    </td>
                    <td>
                      <span style={{
                        fontFamily: 'var(--mono)',
                        color: !m.dias_sin_vacuna || m.dias_sin_vacuna > 365 ? 'var(--danger)' : 'var(--warn)',
                      }}>
                        {m.dias_sin_vacuna ? `${m.dias_sin_vacuna} días` : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!data && !loading && (
        <div className="empty" style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
          Presiona "Consultar" para ver la demo de caché Redis
        </div>
      )}
    </AppLayout>
  );
}