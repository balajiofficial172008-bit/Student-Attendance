import React, { useState, useEffect } from 'react';
import { User, Lock, Bell, Sliders, Moon, Sun, Save, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { authService } from '../../services/authService';
import { Settings } from '../../types';
import toast from 'react-hot-toast';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications' | 'system'>('profile');
  const [settings, setSettings] = useState<Settings>(authService.getSettings());

  // Profile
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  // Password
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { setSettings(authService.getSettings()); }, []);

  const saveProfile = () => {
    if (!name.trim()) { toast.error('Name is required.'); return; }
    updateUser({ name, email });
    toast.success('Profile updated successfully!');
  };

  const savePassword = () => {
    if (!currentPass || !newPass) { toast.error('All fields required.'); return; }
    if (newPass !== confirmPass) { toast.error('New passwords do not match.'); return; }
    if (newPass.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    try {
      authService.changePassword(user!.id, currentPass, newPass);
      toast.success('Password changed successfully!');
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
    } catch (err: any) { toast.error(err.message); }
  };

  const saveSettings = (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    authService.saveSettings(newSettings);
    if (updates.theme) setTheme(updates.theme);
    toast.success('Settings saved!');
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'password', label: 'Password', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'system', label: 'System', icon: Sliders },
  ] as const;

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border-color)', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 20px', background:'none', border:'none', borderBottom: activeTab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === t.id ? 'var(--color-primary)' : 'var(--text-secondary)', fontWeight: activeTab === t.id ? 700 : 500, fontSize:14, cursor:'pointer', transition:'var(--transition)' }}>
            <t.icon size={16} />{t.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Profile Information</span></div>
          <div className="card-body">
            <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:28, padding:20, background:'var(--bg-surface-2)', borderRadius:12 }}>
              <div className="avatar avatar-xl" style={{ background:'linear-gradient(135deg,#4f46e5,#06b6d4)', fontSize:28 }}>
                {getInitials(user?.name || 'A')}
              </div>
              <div>
                <div style={{ fontWeight:800, fontSize:20 }}>{user?.name}</div>
                <div style={{ color:'var(--text-muted)', fontSize:13 }}>{user?.email}</div>
                <span className={`badge ${user?.role === 'admin' ? 'badge-primary' : 'badge-success'}`} style={{ marginTop:8, display:'inline-flex' }}>
                  {user?.role === 'admin' ? '🔑 Administrator' : '👨‍🏫 Faculty'}
                </span>
              </div>
            </div>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <input className="form-input" value={user?.role === 'admin' ? 'Administrator' : 'Faculty'} disabled style={{ opacity:0.7 }} />
              </div>
            </div>
          </div>
          <div className="card-footer"><button className="btn btn-primary" onClick={saveProfile}><Save size={16}/>Save Profile</button></div>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Change Password</span></div>
          <div className="card-body">
            <div style={{ maxWidth:420 }}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <div className="input-group">
                  <Lock size={16} className="input-icon" />
                  <input className="form-input" type={showCurrent ? 'text' : 'password'} value={currentPass} onChange={e => setCurrentPass(e.target.value)} placeholder="Enter current password" />
                  <button type="button" className="input-suffix" onClick={() => setShowCurrent(!showCurrent)}>{showCurrent ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div className="input-group">
                  <Lock size={16} className="input-icon" />
                  <input className="form-input" type={showNew ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="At least 6 characters" />
                  <button type="button" className="input-suffix" onClick={() => setShowNew(!showNew)}>{showNew ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <div className="input-group">
                  <Lock size={16} className="input-icon" />
                  <input className="form-input" type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Re-enter new password" />
                </div>
              </div>
              {newPass && confirmPass && newPass !== confirmPass && (
                <p className="form-error">Passwords do not match.</p>
              )}
            </div>
          </div>
          <div className="card-footer"><button className="btn btn-primary" onClick={savePassword}><Save size={16}/>Change Password</button></div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Notification Preferences</span></div>
          <div className="card-body">
            <div className="settings-section">
              {[
                { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive notifications via email' },
                { key: 'lowAttendanceAlert', label: 'Low Attendance Alerts', desc: 'Alert when student attendance drops below threshold' },
              ].map(item => (
                <div key={item.key} className="settings-item">
                  <div>
                    <div className="settings-item-label">{item.label}</div>
                    <div className="settings-item-desc">{item.desc}</div>
                  </div>
                  <button
                    className={`toggle ${(settings as any)[item.key] ? 'on' : ''}`}
                    onClick={() => saveSettings({ [item.key]: !(settings as any)[item.key] } as any)}
                  />
                </div>
              ))}
            </div>
            <div className="form-group" style={{ maxWidth:280 }}>
              <label className="form-label">Attendance Alert Threshold</label>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <input className="form-input" type="number" min={50} max={95} value={settings.attendanceThreshold}
                  onChange={e => setSettings({ ...settings, attendanceThreshold: Number(e.target.value) })} style={{ maxWidth:100 }} />
                <span style={{ color:'var(--text-muted)', fontSize:13 }}>% (students below this are flagged)</span>
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop:12 }} onClick={() => saveSettings({ attendanceThreshold: settings.attendanceThreshold })}>Save Threshold</button>
            </div>
          </div>
        </div>
      )}

      {/* System Tab */}
      {activeTab === 'system' && (
        <div className="card">
          <div className="card-header"><span className="card-title">System Preferences</span></div>
          <div className="card-body">
            <div className="settings-section">
              <div className="settings-section-title">Institution Information</div>
              <div className="settings-item">
                <div>
                  <div className="settings-item-label">College Name</div>
                  <div className="settings-item-desc">Mahendra Engineering College (Autonomous)</div>
                </div>
                <span className="badge badge-primary">Autonomous</span>
              </div>
              <div className="settings-item">
                <div>
                  <div className="settings-item-label">Campus Location</div>
                  <div className="settings-item-desc">Main Campus • Approved by AICTE, Affiliated to Anna University</div>
                </div>
                <span className="badge badge-success">Main Campus</span>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section-title">Appearance</div>
              <div className="settings-item">
                <div>
                  <div className="settings-item-label">Theme</div>
                  <div className="settings-item-desc">Switch between light and dark mode</div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className={`btn btn-sm ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => saveSettings({ theme:'light' })}><Sun size={14}/>Light</button>
                  <button className={`btn btn-sm ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => saveSettings({ theme:'dark' })}><Moon size={14}/>Dark</button>
                </div>
              </div>
            </div>
            <div className="settings-section">
              <div className="settings-section-title">Academic Settings</div>
              <div className="settings-item">
                <div>
                  <div className="settings-item-label">Auto Mark Absent</div>
                  <div className="settings-item-desc">Automatically mark unmarked students as absent</div>
                </div>
                <button className={`toggle ${settings.autoMarkAbsent ? 'on' : ''}`} onClick={() => saveSettings({ autoMarkAbsent: !settings.autoMarkAbsent })} />
              </div>
              <div className="settings-item">
                <div>
                  <div className="settings-item-label">Working Days Per Week</div>
                  <div className="settings-item-desc">Number of working days in a week</div>
                </div>
                <select className="form-input form-select" style={{ width:80 }} value={settings.workingDaysPerWeek}
                  onChange={e => saveSettings({ workingDaysPerWeek: Number(e.target.value) })}>
                  {[4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div className="settings-section">
              <div className="settings-section-title" style={{ color:'var(--color-danger)' }}>Danger Zone</div>
              <div className="settings-item">
                <div>
                  <div className="settings-item-label" style={{ color:'var(--color-danger)' }}>Reset Demo Data</div>
                  <div className="settings-item-desc">Restore all sample data to default state</div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => {
                  if (window.confirm('Reset all data to demo defaults?')) {
                    authService.resetData();
                    toast.success('Data reset to defaults. Refreshing…');
                    setTimeout(() => window.location.reload(), 1000);
                  }
                }}>Reset</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
