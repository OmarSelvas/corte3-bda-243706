const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getSession() {
  if (typeof window === 'undefined') return { rol: 'recepcion', vetId: null };
  try {
    return JSON.parse(localStorage.getItem('session') || '{}');
  } catch {
    return { rol: 'recepcion', vetId: null };
  }
}

async function apiFetch(path, options = {}) {
  const session = getSession();
  const headers = {
    'Content-Type': 'application/json',
    'X-Rol': session.rol || 'recepcion',
    ...(session.vetId ? { 'X-Vet-Id': String(session.vetId) } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'Error de servidor');
  return data;
}

export const api = {
  get:  (path) => apiFetch(path),
  post: (path, body) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) }),
};

export function saveSession(session) {
  localStorage.setItem('session', JSON.stringify(session));
}

export function getSessionData() {
  return getSession();
}