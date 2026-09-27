import { User, LoginCredentials, Settings } from '../types';
import {
  seedUsers, seedPasswords, seedSettings
} from '../data/seedData';

const USERS_KEY = 'sams_users';
const CURRENT_USER_KEY = 'sams_current_user';
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
  login(credentials: LoginCredentials): User {
    const users = getUsers();
    const passwords = getPasswords();
    const user = users.find(u =>
      u.email.toLowerCase() === credentials.email.toLowerCase()
    );
    if (!user) throw new Error('No account found with this email address.');
    if (passwords[user.email] !== credentials.password) throw new Error('Incorrect password. Please try again.');
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  },

  logout(): void {
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  getCurrentUser(): User | null {
    const data = localStorage.getItem(CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  },

  updateProfile(userId: string, updates: Partial<User>): User {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error('User not found.');
    users[idx] = { ...users[idx], ...updates };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    const currentUser = authService.getCurrentUser();
    if (currentUser?.id === userId) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(users[idx]));
    }
    return users[idx];
  },

  changePassword(userId: string, currentPassword: string, newPassword: string): void {
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
  },

  resetData(): void {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('sams_'));
    keys.forEach(k => { if (k !== CURRENT_USER_KEY) localStorage.removeItem(k); });
  },
};
