const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5206';

export const tripService = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/api/trips`);
    if (!res.ok) throw new Error(`Błąd API: ${res.status} ${res.statusText}`);
    return res.json();
  },
};
