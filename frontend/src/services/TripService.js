const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5206';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('jwt_token')}`,
});

const readError = async (res, fallback) => {
  const body = await res.json().catch(() => ({}));
  return new Error(body.error || body.Error || fallback);
};

export const tripService = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/api/trips`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Błąd pobierania wycieczek: ${res.status}`);
    return res.json();
  },

  getById: async (id) => {
    const res = await fetch(`${API_BASE}/api/trips/${id}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Błąd pobierania wycieczki: ${res.status}`);
    return res.json();
  },

  create: async (data) => {
    const res = await fetch(`${API_BASE}/api/trips`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw await readError(res, `Błąd tworzenia wycieczki: ${res.status}`);
    return res.json();
  },

  update: async (id, data) => {
    const res = await fetch(`${API_BASE}/api/trips/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw await readError(res, 'Błąd zapisu.');
  },

  delete: async (id) => {
    const res = await fetch(`${API_BASE}/api/trips/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw await readError(res, `Błąd usuwania wycieczki: ${res.status}`);
  },

  addParticipant: async (tripId, userId) => {
    const res = await fetch(`${API_BASE}/api/trips/${tripId}/participants`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw await readError(res, `Błąd dodawania uczestnika: ${res.status}`);
  },

  removeParticipant: async (tripId, userId) => {
    const res = await fetch(`${API_BASE}/api/trips/${tripId}/participants/${userId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw await readError(res, 'Błąd usuwania.');
  },

  leave: async (id) => {
    const res = await fetch(`${API_BASE}/api/trips/${id}/leave`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw await readError(res, 'Błąd opuszczania wycieczki.');
  },

  lockPlan: async (id) => {
    const res = await fetch(`${API_BASE}/api/trips/${id}/plan-lock`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    if (!res.ok) throw await readError(res, 'Nie udało się zamknąć planu.');
    return res.json();
  },

  unlockPlan: async (id) => {
    const res = await fetch(`${API_BASE}/api/trips/${id}/plan-lock`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw await readError(res, 'Nie udało się wznowić planowania.');
    return res.json();
  },
};
