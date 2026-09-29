import { BackendStatusInfo } from '../../types';

let cachedBackendStatus: BackendStatusInfo = {
  mode: 'resilient_mock',
  url: '/api',
  latencyMs: 0,
  connected: false,
};

type StatusListener = (status: BackendStatusInfo) => void;
const listeners: Set<StatusListener> = new Set();

export function subscribeBackendStatus(fn: StatusListener): () => void {
  listeners.add(fn);
  fn(cachedBackendStatus);
  return () => {
    listeners.delete(fn);
  };
}

function notifyListeners(): void {
  listeners.forEach(fn => fn(cachedBackendStatus));
}

export async function checkBackendHealth(): Promise<BackendStatusInfo> {
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch('/api/health', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    const latency = Math.round(performance.now() - start);

    if (res.ok) {
      const data = await res.json();
      cachedBackendStatus = {
        mode: 'live_api',
        url: 'http://localhost:5000/api',
        latencyMs: latency,
        serverTime: data.serverTime,
        uptime: data.uptimeSeconds,
        connected: true,
      };
    } else {
      cachedBackendStatus = {
        mode: 'resilient_mock',
        url: 'localStorage (Resilient Engine)',
        latencyMs: latency,
        connected: false,
      };
    }
  } catch {
    cachedBackendStatus = {
      mode: 'resilient_mock',
      url: 'localStorage (Resilient Engine)',
      latencyMs: 0,
      connected: false,
    };
  }

  notifyListeners();
  return cachedBackendStatus;
}

// Initial health check in background
if (typeof window !== 'undefined') {
  checkBackendHealth();
  // Periodic ping every 25 seconds
  setInterval(checkBackendHealth, 25000);
}

export function getBackendStatus(): BackendStatusInfo {
  return cachedBackendStatus;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data: T; message?: string; meta?: any }> {
  const token = sessionStorage.getItem('sams_token') || localStorage.getItem('sams_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('/') ? `/api${endpoint}` : `/api/${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg = body?.message || body?.error || `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(errorMsg);
  }

  return body;
}
