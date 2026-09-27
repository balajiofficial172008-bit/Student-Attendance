import React from 'react';
import { Menu, Sun, Moon, Bell, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { notificationService } from '../../services/notificationService';

interface NavbarProps {
  onMenuToggle: () => void;
  pageTitle: string;
  pageSubtitle?: string;
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Welcome back! Here\'s what\'s happening today.' },
  '/students': { title: 'Student Management', subtitle: 'Manage all enrolled students' },
  '/attendance': { title: 'Mark Attendance', subtitle: 'Record and manage class attendance' },
  '/attendance-history': { title: 'Attendance History', subtitle: 'View and analyse attendance records' },
  '/subjects': { title: 'Subjects', subtitle: 'Manage academic subjects' },
  '/faculty': { title: 'Faculty Management', subtitle: 'Manage teaching staff' },
  '/departments': { title: 'Departments', subtitle: 'Manage academic departments' },
  '/reports': { title: 'Reports', subtitle: 'Generate and export attendance reports' },
  '/notifications': { title: 'Notifications', subtitle: 'System alerts and messages' },
  '/settings': { title: 'Settings', subtitle: 'Configure system preferences' },
};

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function Navbar({ onMenuToggle, pageTitle }: NavbarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const unreadCount = user ? notificationService.getUnreadCount(user.id) : 0;
  const info = pageTitles[pageTitle] || { title: pageTitle, subtitle: '' };

  return (
    <header className="navbar">
      <button className="navbar-menu-btn" onClick={onMenuToggle}>
        <Menu size={20} />
      </button>

      <div className="navbar-breadcrumb">
        <div className="navbar-page-title">{info.title}</div>
        {info.subtitle && <div className="navbar-page-sub">{info.subtitle}</div>}
      </div>

      <div className="navbar-actions">
        <button className="navbar-icon-btn" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="navbar-icon-btn" onClick={() => navigate('/notifications')} title="Notifications">
          <Bell size={18} />
          {unreadCount > 0 && <span className="notification-dot" />}
        </button>
        <div className="navbar-profile" onClick={() => navigate('/settings')}>
          <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg, #4f46e5, #06b6d4)' }}>
            {getInitials(user?.name || 'A')}
          </div>
          <div className="hide-mobile">
            <div className="navbar-profile-name">{user?.name?.split(' ')[0]}</div>
            <div className="navbar-profile-role">{user?.role}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
