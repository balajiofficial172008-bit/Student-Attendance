import { Notification, NotificationType } from '../types';
import { seedNotifications } from '../data/seedData';

const KEY = 'sams_notifications';

function init(): void {
  if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(seedNotifications));
}

export const notificationService = {
  getAll(userId?: string): Notification[] {
    init();
    const all: Notification[] = JSON.parse(localStorage.getItem(KEY) || '[]');
    return userId ? all.filter(n => n.userId === userId) : all;
  },

  getUnreadCount(userId: string): number {
    return this.getAll(userId).filter(n => !n.read).length;
  },

  create(data: { userId: string; title: string; message: string; type: NotificationType; link?: string }): Notification {
    const all = this.getAll();
    const notification: Notification = {
      id: `notif_${Date.now()}`,
      read: false,
      createdAt: new Date().toISOString(),
      ...data,
    };
    all.unshift(notification);
    // Keep last 50 notifications
    localStorage.setItem(KEY, JSON.stringify(all.slice(0, 50)));
    return notification;
  },

  markAsRead(id: string): void {
    const all = this.getAll();
    const idx = all.findIndex(n => n.id === id);
    if (idx !== -1) {
      all[idx].read = true;
      localStorage.setItem(KEY, JSON.stringify(all));
    }
  },

  markAllAsRead(userId: string): void {
    const all = this.getAll();
    all.forEach(n => { if (n.userId === userId) n.read = true; });
    localStorage.setItem(KEY, JSON.stringify(all));
  },

  delete(id: string): void {
    const all = this.getAll().filter(n => n.id !== id);
    localStorage.setItem(KEY, JSON.stringify(all));
  },
};
