'use client';
import { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import { api, getSessionData } from '../../lib/api';

export default function CitasPage() {
  const [citas,     setCitas]     = useState([]);
  const [mascotas,  setMascotas]  = useState([]);
  const [vets,      setVets]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [success,   setSuccess]   = useState(null);
  const [session,   setSession]   = useState(null);
  const [showForm,  setShowForm]  = useState(false);

  const [form, setForm] = useState({
    mascota_id: '', veterinario_id: '', fecha_hora: '', motivo: '',
  });

  useEffect(() => {
    const s = getSessionData();
    setSession(s);
    loadAll(s);
  }, []);

  async function loadAll(s) {
    setLoading(true);
    try {
      const [c, m, v] = await Promise.all([
        api.get('/api/citas'),
        api.get('/api/mascotas?search='),
        api.get('/api/veterinarios'),
      ]);
      setCitas(c.data);
      setMascotas(m.data);
      setVets(v.data.filter(v => v.activo));
      if (s?.rol === 'vet') {
        setForm(f => ({ ...f, veterinario_id: String(s.vetId) }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await api.post('/api/citas', {
        mascota_id:    parseInt(form.mascota_id),
        veterinario_id: parseInt(form.veterinario_id),
        fecha_hora:    form.fecha_hora,
        motivo:        form.motivo,
      });
      setSuccess('Cita agendada correctamente');
      setShowForm(false);
      setForm({ mascota_id: '', veterinario_id: String(session?.vetId || ''), fecha_hora: '', motivo: '' });
      const c = await api.get('/api/citas');
      setCitas(c.data);
    } catch (err) {
      setError(err.message);
    }
  }

  const ESTADO_COLOR = {
    AGENDADA:   'var(--accent2)',
    COMPLETADA: 'var(--accent)',
    CANCELADA:  'var(--danger)',
  };

  return (
    <AppLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <h1>Citas</h1>
          <p className="subtitle">
            {session?.rol === 'vet'
              ? '⚡ RLS activo — solo ves las citas donde eres el veterinario asignado'
              : 'Todas las citas de la clínica'}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nueva cita'}
        </button>
      </div>

      {error   && <div className="alert alert-error">{error}</div>}
      {success  && <div className="alert alert-success">{success}</div>}

      {/* Formulario de nueva cita */}
      {showForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2>Agendar nueva cita</h2>
          <form onSubmit={handleSubmit}>
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
                <label>Veterinario</label>
                <select
                  value={form.veterinario_id}
                  onChange={e => setForm(f => ({ ...f, veterinario_id: e.target.value }))}
                  required
                  disabled={session?.rol === 'vet'}
                >
                  <option value="">Seleccionar veterinario...</option>
                  {vets.map(v => (
                    <option key={v.id} value={v.id}>{v.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Fecha y hora</label>
                <input
                  type="datetime-local"
                  value={form.fecha_hora}
                  onChange={e => setForm(f => ({ ...f, fecha_hora: e.target.value }))}
                  required
                />
              </div>

              <div className="field">
                <label>Motivo</label>
                <input
                  type="text"
                  placeholder="Revisión, vacunación, urgencia..."
                  value={form.motivo}
                  onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button className="btn-primary" type="submit">Agendar cita</button>
              <button className="btn-secondary" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de citas */}
      {loading ? (
        <div className="spinner" />
      ) : (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0 }}>{citas.length} cita{citas.length !== 1 ? 's' : ''}</h2>
            {session?.rol === 'vet' && (
              <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>
                RLS: veterinario_id = {session.vetId}
              </span>
            )}
          </div>

          {citas.length === 0 ? (
            <div className="empty">No hay citas registradas</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Mascota</th>
                  <th>Veterinario</th>
                  <th>Motivo</th>
                  <th>Costo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {citas.map(c => (
                  <tr key={c.id}>
                    <td>{new Date(c.fecha_hora).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td style={{ fontWeight: 600, fontFamily: 'var(--sans)', color: 'var(--text)' }}>{c.mascota}</td>
                    <td>{c.veterinario}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.motivo || '—'}</td>
                    <td>{c.costo ? `$${parseFloat(c.costo).toLocaleString('es-MX')}` : '—'}</td>
                    <td>
                      <span style={{
                        fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: 700,
                        color: ESTADO_COLOR[c.estado] || 'var(--text-muted)',
                      }}>
                        {c.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </AppLayout>
  );
}