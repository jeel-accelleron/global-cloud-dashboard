import axios from 'axios';

export const API_BASE = '/api/workitems';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const message =
      err?.response?.data?.error ||
      err?.response?.data?.detail ||
      err?.message ||
      'Request failed';
    return Promise.reject(new Error(message));
  }
);
