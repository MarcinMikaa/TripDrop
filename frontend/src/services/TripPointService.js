const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5206';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('jwt_token')}`,
});

export const tripPointService = {
  getByTripId: async (tripId) => {
    const res = await fetch(`${API_BASE}/api/trips/${tripId}/points`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Błąd pobierania pinezek: ${res.status}`);
    return res.json();
  },

  create: async (tripId, data) => {
    const res = await fetch(`${API_BASE}/api/trips/${tripId}/points`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.Error || `Błąd tworzenia pinezki: ${res.status}`);
    }
    return res.json();
  },

  update: async (tripId, pointId, data) => {
    const res = await fetch(`${API_BASE}/api/trips/${tripId}/points/${pointId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.Error || `Błąd aktualizacji pinezki: ${res.status}`);
    }
  },

  delete: async (tripId, pointId) => {
    const res = await fetch(`${API_BASE}/api/trips/${tripId}/points/${pointId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.Error || `Błąd usuwania pinezki: ${res.status}`);
    }
  },
};
