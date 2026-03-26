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

let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only handle 401 (unauthorized), not network errors
    if (error.response?.status === 401 && !isRedirecting) {
      isRedirecting = true;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Use a small delay to prevent loop
      setTimeout(() => {
        window.location.href = '/login';
        isRedirecting = false;
      }, 100);
    }
    return Promise.reject(error);
  }
);

export default api;
