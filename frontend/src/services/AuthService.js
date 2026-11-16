const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5206';

const readError = async (res, fallback) => {
  const body = await res.json().catch(() => ({}));
  return new Error(body.error || body.Error || body.message || fallback);
};

export const authService = {
  register: async (email, username, password) => {
    const res = await fetch(`${API_BASE}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
    });

    if (!res.ok) throw await readError(res, `Błąd rejestracji: ${res.status}`);
    return res.json().catch(() => ({}));
  },

  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) throw await readError(res, 'Nieprawidłowy e-mail lub hasło.');
    return res.json();
  },

  checkUsername: async (username, { signal } = {}) => {
    const res = await fetch(`${API_BASE}/api/users/username-available?username=${encodeURIComponent(username)}`, {
      signal,
    });

    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return typeof data?.available === 'boolean' ? data.available : null;
  },

  logout: () => {},
};
