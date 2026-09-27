import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, ClipboardList, History, BookOpen,
  GraduationCap, Building2, FileBarChart2, Bell, Settings, LogOut, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { label: 'Main', items: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  ]},
  { label: 'Academic', items: [
    { to: '/students', icon: Users, label: 'Students' },
    { to: '/attendance', icon: ClipboardList, label: 'Attendance' },
    { to: '/attendance-history', icon: History, label: 'Att. History' },
    { to: '/subjects', icon: BookOpen, label: 'Subjects' },
  ]},
  { label: 'Management', items: [
    { to: '/faculty', icon: GraduationCap, label: 'Faculty' },
    { to: '/departments', icon: Building2, label: 'Departments' },
    { to: '/reports', icon: FileBarChart2, label: 'Reports' },
  ]},
  { label: 'System', items: [
    { to: '/notifications', icon: Bell, label: 'Notifications', badge: true },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ]},
];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const unreadCount = user ? notificationService.getUnreadCount(user.id) : 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🎓</div>
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-college" title="Mahendra Engineering College (Autonomous)">
              Mahendra Engg College
            </div>
            <div className="sidebar-logo-campus">
              Autonomous • Main Campus
            </div>
            <div className="sidebar-logo-sub">
              Attend Pro ERP
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" style={{ color: 'rgba(255,255,255,0.5)', marginLeft: 'auto' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(group => (
            <div key={group.label}>
              <div className="sidebar-section-label">{group.label}</div>
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <item.icon size={17} />
                  {item.label}
                  {item.badge && unreadCount > 0 && (
                    <span className="sidebar-badge">{unreadCount}</span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}

          <div className="sidebar-section-label">Account</div>
          <button className="sidebar-item" style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }} onClick={handleLogout}>
            <LogOut size={17} />
            Logout
          </button>
        </nav>

        <div className="sidebar-footer">
          <NavLink to="/settings" className="sidebar-user" onClick={onClose}>
            <div className="sidebar-avatar">
              {getInitials(user?.name || 'Admin')}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">{user?.role === 'admin' ? 'Administrator' : 'Faculty'}</div>
            </div>
          </NavLink>
        </div>
      </aside>
    </>
  );
}
