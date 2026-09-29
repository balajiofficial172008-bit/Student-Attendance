import { User, LoginCredentials, Settings } from '../types';
import {
  seedUsers, seedPasswords, seedSettings
} from '../data/seedData';
import { apiRequest, getBackendStatus } from './api/apiClient';
import { mockBackendEngine } from './api/mockBackendEngine';

const USERS_KEY = 'sams_users';
const CURRENT_USER_KEY = 'sams_current_user';
const TOKEN_KEY = 'sams_token';
const PASSWORDS_KEY = 'sams_passwords';
const SETTINGS_KEY = 'sams_settings';

function initUsers(): void {
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify(seedUsers));
  }
  if (!localStorage.getItem(PASSWORDS_KEY)) {
    localStorage.setItem(PASSWORDS_KEY, JSON.stringify(seedPasswords));
  }
  if (!localStorage.getItem(SETTINGS_KEY)) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(seedSettings));
  }
}

function getUsers(): User[] {
  initUsers();
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function getPasswords(): Record<string, string> {
  initUsers();
  return JSON.parse(localStorage.getItem(PASSWORDS_KEY) || '{}');
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<User> {
    const backend = getBackendStatus();

    // If connected to Express server, authenticate against API
    if (backend.connected) {
      try {
        const res = await apiRequest<User & { token: string }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify(credentials),
        });

        if (res.data.token) {
          sessionStorage.setItem(TOKEN_KEY, res.data.token);
          localStorage.setItem(TOKEN_KEY, res.data.token);
        }

        sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(res.data));
        return res.data;
      } catch (err: any) {
        // If wrong credentials returned by server, rethrow error
        if (err.message && !err.message.includes('Failed to fetch')) {
          throw err;
        }
      }
    }

    // Local / Offline authentication fallback
    const users = getUsers();
    const passwords = getPasswords();
    const user = users.find(u =>
      u.email.toLowerCase() === credentials.email.toLowerCase()
    );
    if (!user) throw new Error('No account found with this email address.');
    if (passwords[user.email] !== credentials.password) throw new Error('Incorrect password. Please try again.');

    const mockToken = btoa(JSON.stringify({ userId: user.id, email: user.email, role: user.role, time: Date.now() }));
    sessionStorage.setItem(TOKEN_KEY, mockToken);
    localStorage.setItem(TOKEN_KEY, mockToken);
    sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    localStorage.removeItem(CURRENT_USER_KEY);

    mockBackendEngine.log('USER_LOGIN', 'auth', `User ${user.name} logged in via local auth`, user, user.id);

    return user;
  },

  logout(): void {
    sessionStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  },

  getCurrentUser(): User | null {
    if (localStorage.getItem(CURRENT_USER_KEY)) {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
    const data = sessionStorage.getItem(CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  },

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  },

  async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    const backend = getBackendStatus();
    if (backend.connected) {
      try {
        const res = await apiRequest<User>('/auth/profile', {
          method: 'PUT',
          body: JSON.stringify({ userId, updates }),
        });
        sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(res.data));
        return res.data;
      } catch (e) {
        console.warn('Backend updateProfile failed, updating local:', e);
      }
    }

    const users = getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error('User not found.');
    users[idx] = { ...users[idx], ...updates };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    const currentUser = authService.getCurrentUser();
    if (currentUser?.id === userId) {
      sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(users[idx]));
    }
    return users[idx];
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const backend = getBackendStatus();
    if (backend.connected) {
      try {
        await apiRequest('/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({ userId, currentPassword, newPassword }),
        });
        return;
      } catch (err) {
        console.warn('Backend changePassword failed, updating local:', err);
      }
    }

    const users = getUsers();
    const passwords = getPasswords();
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error('User not found.');
    if (passwords[user.email] !== currentPassword) throw new Error('Current password is incorrect.');
    passwords[user.email] = newPassword;
    localStorage.setItem(PASSWORDS_KEY, JSON.stringify(passwords));
  },

  getSettings(): Settings {
    initUsers();
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || JSON.stringify(seedSettings));
  },

  saveSettings(settings: Settings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    const backend = getBackendStatus();
    if (backend.connected) {
      apiRequest('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      }).catch(() => {});
    }
  },

  resetData(): void {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('sams_'));
    keys.forEach(k => { if (k !== CURRENT_USER_KEY) localStorage.removeItem(k); });
    sessionStorage.removeItem(CURRENT_USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);

    const backend = getBackendStatus();
    if (backend.connected) {
      apiRequest('/auth/reset', { method: 'POST' }).catch(() => {});
    }
  },
};
