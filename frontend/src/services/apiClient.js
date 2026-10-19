import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5206';

const apiClient = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.error('Sesja wygasła lub brak dostępu.');
    }
    return Promise.reject(error);
  },
);

export const toApiError = (err, fallback) => {
  if (axios.isCancel(err)) {
    return Object.assign(new Error('Zapytanie przerwane.'), { canceled: true });
  }
  if (!err.response) {
    return Object.assign(new Error('Brak połączenia z serwerem.'), { status: 0 });
  }
  const body = err.response.data;
  return Object.assign(new Error(body?.error || body?.Error || fallback), {
    status: err.response.status,
  });
};

export default apiClient;
