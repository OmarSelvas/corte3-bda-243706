'use client';
import { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import { api, getSessionData } from '../../lib/api';

export default function InventarioPage() {
  const [inventario, setInventario] = useState([]);
  const [mascotas,   setMascotas]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [success,    setSuccess]    = useState(null);
  const [session,    setSession]    = useState(null);
  const [showForm,   setShowForm]   = useState(false);

  const [form, setForm] = useState({
    mascota_id: '', vacuna_id: '', fecha_aplicacion: '', costo_cobrado: '',
  });

  useEffect(() => {
    const s = getSessionData();
    setSession(s);
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [inv, m] = await Promise.all([
        api.get('/api/inventario-vacunas'),
        api.get('/api/mascotas?search='),
      ]);
      setInventario(inv.data);
      setMascotas(m.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAplicar(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await api.post('/api/vacunas', {
        mascota_id:       parseInt(form.mascota_id),
        vacuna_id:        parseInt(form.vacuna_id),
        fecha_aplicacion: form.fecha_aplicacion || undefined,
        costo_cobrado:    parseFloat(form.costo_cobrado) || undefined,
      });
      setSuccess('✓ Vacuna aplicada. El caché de vacunación pendiente fue invalidado automáticamente.');
      setShowForm(false);
      setForm({ mascota_id: '', vacuna_id: '', fecha_aplicacion: '', costo_cobrado: '' });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AppLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <h1>Inventario de Vacunas</h1>
          <p className="subtitle">Solo visible para administradores — aplica vacunas e invalida caché Redis</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Aplicar vacuna'}
        </button>
      </div>

      {error   && <div className="alert alert-error">{error}</div>}
      {success  && <div className="alert alert-success">{success}</div>}

      {/* Formulario aplicar vacuna */}
      {showForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>Aplicar vacuna</h2>
          <div className="alert alert-info" style={{ marginBottom: '16px' }}>
            Al aplicar una vacuna, el caché Redis de vacunación pendiente se invalida
            automáticamente. La próxima consulta hará un CACHE MISS y reflejará el cambio.
          </div>
          <form onSubmit={handleAplicar}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="field">
                <label>Mascota</label>
                <select
                  value={form.mascota_id}
                  onChange={e => setForm(f => ({ ...f, mascota_id: e.target.value }))}
                  required
                >
                  <option value="">Seleccionar mascota...</option>
                  {mascotas.map(m => (
                    <option key={m.id} value={m.id}>{m.nombre} ({m.especie})</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Vacuna</label>
                <select
                  value={form.vacuna_id}
                  onChange={e => setForm(f => ({ ...f, vacuna_id: e.target.value }))}
                  required
                >
                  <option value="">Seleccionar vacuna...</option>
                  {inventario.map(v => (
                    <option key={v.id} value={v.id} disabled={v.stock_actual === 0}>
                      {v.nombre} — Stock: {v.stock_actual} {v.stock_actual === 0 ? '(AGOTADO)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Fecha de aplicación</label>
                <input
                  type="date"
                  value={form.fecha_aplicacion}
                  onChange={e => setForm(f => ({ ...f, fecha_aplicacion: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Costo cobrado ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.costo_cobrado}
                  onChange={e => setForm(f => ({ ...f, costo_cobrado: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-primary" type="submit">Aplicar e invalidar caché</button>
              <button className="btn-secondary" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="spinner" />
      ) : (
        <div className="card">
          <h2 style={{ marginBottom: '16px' }}>{inventario.length} vacunas en catálogo</h2>
          <table>
            <thead>
              <tr>
                <th>Vacuna</th>
                <th>Stock actual</th>
                <th>Stock mínimo</th>
                <th>Costo unitario</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {inventario.map(v => {
                const bajo = v.stock_actual < v.stock_minimo;
                return (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 600, fontFamily: 'var(--sans)', color: 'var(--text)' }}>{v.nombre}</td>
                    <td style={{ color: bajo ? 'var(--danger)' : 'var(--accent)', fontWeight: 700 }}>
                      {v.stock_actual}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{v.stock_minimo}</td>
                    <td>${parseFloat(v.costo_unitario).toLocaleString('es-MX')}</td>
                    <td>
                      {bajo ? (
                        <span style={{
                          fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: 700,
                          color: 'var(--danger)', background: 'rgba(255,71,87,0.1)',
                          padding: '2px 8px', borderRadius: '20px',
                        }}>
                          ⚠ STOCK BAJO
                        </span>
                      ) : (
                        <span style={{
                          fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: 700,
                          color: 'var(--accent)', background: 'rgba(0,212,170,0.1)',
                          padding: '2px 8px', borderRadius: '20px',
                        }}>
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}