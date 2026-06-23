const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5206';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('jwt_token')}`,
});

export const friendshipService = {
  searchUsers: async (term) => {
    const res = await fetch(`${API_BASE}/api/friendships/search?term=${encodeURIComponent(term)}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Błąd wyszukiwania.');
    return res.json();
  },

  getPending: async () => {
    const res = await fetch(`${API_BASE}/api/friendships/pending`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Błąd pobierania zaproszeń.');
    return res.json();
  },

  getFriends: async () => {
    const res = await fetch(`${API_BASE}/api/friendships`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Błąd pobierania znajomych.');
    return res.json();
  },

  sendInvite: async (addresseeId) => {
    const res = await fetch(`${API_BASE}/api/friendships/invite`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ addresseeId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.Error || 'Błąd wysyłania zaproszenia.');
    }
    return res.json();
  },

  accept: async (friendshipId) => {
    const res = await fetch(`${API_BASE}/api/friendships/${friendshipId}/accept`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.Error || 'Błąd akceptacji zaproszenia.');
    }
  },

  reject: async (friendshipId) => {
    const res = await fetch(`${API_BASE}/api/friendships/${friendshipId}/reject`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.Error || 'Błąd odrzucenia zaproszenia.');
    }
  },
};
