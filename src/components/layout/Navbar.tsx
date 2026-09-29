import React, { useState, useEffect } from 'react';
import { Menu, Sun, Moon, Bell, Server, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { notificationService } from '../../services/notificationService';
import { subscribeBackendStatus, checkBackendHealth } from '../../services/api/apiClient';
import { BackendStatusInfo } from '../../types';
import toast from 'react-hot-toast';

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
  '/leaves': { title: 'Leave & On-Duty (OD)', subtitle: 'Manage approvals and automated attendance credit' },
  '/subjects': { title: 'Subjects', subtitle: 'Manage academic subjects' },
  '/faculty': { title: 'Faculty Management', subtitle: 'Manage teaching staff' },
  '/departments': { title: 'Departments', subtitle: 'Manage academic departments' },
  '/reports': { title: 'Reports', subtitle: 'Generate and export attendance reports' },
  '/audit-logs': { title: 'Audit Trail & Security', subtitle: 'System activities and modification history' },
  '/notifications': { title: 'Notifications', subtitle: 'System alerts and messages' },
  '/settings': { title: 'Settings', subtitle: 'Configure system preferences' },
};

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function Navbar({ onMenuToggle, pageTitle }: NavbarProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [backendStatus, setBackendStatus] = useState<BackendStatusInfo>({
    mode: 'resilient_mock',
    url: '/api',
    latencyMs: 0,
    connected: false,
  });

  const unreadCount = user ? notificationService.getUnreadCount(user.id) : 0;
  const info = pageTitles[pageTitle] || { title: pageTitle, subtitle: '' };

  useEffect(() => {
    const unsubscribe = subscribeBackendStatus(status => {
      setBackendStatus(status);
    });
    return unsubscribe;
  }, []);

  const handlePingBackend = async () => {
    const res = await checkBackendHealth();
    if (res.connected) {
      toast.success(`Connected to Express Backend! Ping: ${res.latencyMs}ms`, { id: 'backend-ping' });
    } else {
      toast('Operating in Resilient Client Engine Mode.', {
        icon: '⚡',
        id: 'backend-ping',
      });
    }
  };

  return (
    <header className="navbar">
      <button className="navbar-menu-btn" onClick={onMenuToggle}>
        <Menu size={20} />
      </button>

      <div className="navbar-breadcrumb">
        <div className="navbar-page-title">{info.title}</div>
        {info.subtitle && <div className="navbar-page-sub">{info.subtitle}</div>}
      </div>

      <div className="navbar-institution hide-mobile">
        <span className="inst-badge-icon">🏛️</span>
        <div className="inst-badge-text">
          <div className="inst-badge-title">Mahendra Engineering College (Autonomous)</div>
          <div className="inst-badge-sub">Main Campus</div>
        </div>
      </div>

      {/* Backend Architecture Indicator */}
      <button
        onClick={handlePingBackend}
        title={
          backendStatus.connected
            ? `Express Node.js Server Active on Port 5000 (Latency: ${backendStatus.latencyMs}ms). Click to test ping.`
            : `Client Resilient Offline Engine Active. Start 'npm run server' for Express mode. Click to test.`
        }
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 20,
          border: `1px solid ${backendStatus.connected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
          background: backendStatus.connected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
          color: backendStatus.connected ? '#10b981' : '#6366f1',
          fontSize: 11.5,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginLeft: 'auto',
          marginRight: 8,
        }}
      >
        {backendStatus.connected ? (
          <>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981',
              }}
            />
            <Server size={13} />
            <span className="hide-mobile">Express API :5000 ({backendStatus.latencyMs}ms)</span>
          </>
        ) : (
          <>
            <Zap size={13} color="#6366f1" />
            <span className="hide-mobile">Resilient Engine</span>
          </>
        )}
      </button>

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
