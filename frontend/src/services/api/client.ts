import axios from 'axios';
import { supabase } from '../supabase';

export const resolveApiBase = (): string => {
  if (typeof window !== 'undefined') {
    // In packaged Electron (file:// protocol) or Electron desktop wrapper, connect directly to local Python server
    if (window.location.protocol === 'file:' || Boolean((window as any).electronAPI)) {
      return 'http://127.0.0.1:8000/api';
    }
    // In Vite dev server (port 5173), proxy through /api
    if (window.location.port === '5173') {
      return '/api';
    }
    return '/api';
  }
  return 'http://127.0.0.1:8000/api';
};

export const API_BASE = (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL !== '/api')
  ? import.meta.env.VITE_API_BASE_URL
  : resolveApiBase();

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000,
});

apiClient.interceptors.request.use(async (config) => {
  // Health checks are public localhost pings; bypass supabase session check to ensure instant sub-millisecond response
  if (config.url && config.url.includes('/health')) {
    return config;
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (err) {
    console.warn('[API] Failed to retrieve session for request:', err);
  }
  return config;
});
