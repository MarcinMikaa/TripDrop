const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5206';

export const authService = {
  register: async (email, username, password) => {
    const res = await fetch(`${API_BASE}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.Error || `Błąd rejestracji: ${res.status}`);
    }
    return res.json();
  },

  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.Error || 'Nieprawidłowy email lub hasło.');
    }

    return res.json();
  },

  logout: () => {},
};
