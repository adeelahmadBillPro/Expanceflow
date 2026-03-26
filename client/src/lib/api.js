import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !isRefreshing) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken && error.config && !error.config._retry) {
        isRefreshing = true;
        error.config._retry = true;
        try {
          const res = await axios.post('/api/auth/refresh', { refreshToken });
          localStorage.setItem('token', res.data.token);
          error.config.headers.Authorization = 'Bearer ' + res.data.token;
          isRefreshing = false;
          return api(error.config);
        } catch {
          // Refresh failed, logout
        }
        isRefreshing = false;
      }
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
