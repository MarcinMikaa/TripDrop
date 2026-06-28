const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5206';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('jwt_token')}`,
});

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
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.Error || `Błąd tworzenia wycieczki: ${res.status}`);
    }
    return res.json();
  },

  delete: async (id) => {
    const res = await fetch(`${API_BASE}/api/trips/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.Error || `Błąd usuwania wycieczki: ${res.status}`);
    }
  },

  addParticipant: async (tripId, userId) => {
    const res = await fetch(`${API_BASE}/api/trips/${tripId}/participants`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.Error || `Błąd dodawania uczestnika: ${res.status}`);
    }
  },
};
