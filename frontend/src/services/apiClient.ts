import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config) => {
    // Authentication is cookie-based. Never put pCloud credentials, passwords,
    // or JWTs into request URLs or application logs.
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (!['/login', '/register', '/forgot-password', '/reset-password'].some((route) => pathname.startsWith(route))) {
        window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
      }
    }
    return Promise.reject(error);
  },
);
