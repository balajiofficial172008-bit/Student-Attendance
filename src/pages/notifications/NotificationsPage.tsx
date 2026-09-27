import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { Notification, NotificationType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const typeConfig: Record<NotificationType, { icon: any; color: string; bg: string }> = {
  alert: { icon: AlertTriangle, color: '#ef4444', bg: '#fee2e2' },
  success: { icon: CheckCircle, color: '#10b981', bg: '#d1fae5' },
  info: { icon: Info, color: '#3b82f6', bg: '#dbeafe' },
  warning: { icon: AlertCircle, color: '#f59e0b', bg: '#fef3c7' },
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const load = () => {
    if (user) setNotifications(notificationService.getAll(user.id));
  };
  useEffect(() => { load(); }, [user]);

  const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;
  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = (id: string) => {
    notificationService.markAsRead(id);
    load();
  };

  const markAll = () => {
    if (user) { notificationService.markAllAsRead(user.id); load(); toast.success('All marked as read.'); }
  };

  const deleteNotif = (id: string) => {
    notificationService.delete(id);
    load();
  };

  const formatTime = (dateStr: string) => {
    try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true }); }
    catch { return dateStr; }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}</p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-outline-primary" onClick={markAll}><CheckCheck size={16} />Mark All Read</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button className={`tab-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')} style={{ flex: 'none', padding: '8px 20px' }}>All ({notifications.length})</button>
        <button className={`tab-btn ${filter === 'unread' ? 'active' : ''}`} onClick={() => setFilter('unread')} style={{ flex: 'none', padding: '8px 20px' }}>Unread ({unreadCount})</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Bell size={40} /></div>
            <div className="empty-state-title">No Notifications</div>
            <div className="empty-state-text">You're all caught up! No new notifications.</div>
          </div>
        ) : filtered.map(n => {
          const cfg = typeConfig[n.type];
          const IconComp = cfg.icon;
          return (
            <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`} onClick={() => !n.read && markRead(n.id)}>
              <div className="notif-icon" style={{ background: cfg.bg, color: cfg.color }}>
                <IconComp size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="notif-title">{n.title}</div>
                <div className="notif-msg">{n.message}</div>
                <div className="notif-time">{formatTime(n.createdAt)}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                {!n.read && <div className="notif-unread-dot" />}
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  style={{ color: 'var(--text-muted)', opacity: 0.6 }}
                  onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
