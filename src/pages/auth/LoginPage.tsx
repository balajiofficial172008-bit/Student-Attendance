import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, GraduationCap, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

type FormMode = 'login' | 'forgot';

export default function LoginPage() {
  const [mode, setMode] = useState<FormMode>('login');
  const [email, setEmail] = useState('admin@college.edu');
  const [password, setPassword] = useState('admin123');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('Email is required.'); return; }
    if (!password) { setError('Password is required.'); return; }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Login successful! Welcome back.');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email.'); return; }
    setForgotSent(true);
    toast.success('Reset link sent! Check your email.');
  };

  const demoAccounts = [
    { label: 'Admin', email: 'admin@college.edu', password: 'admin123', color: '#4f46e5' },
    { label: 'Faculty', email: 'anil@college.edu', password: 'faculty123', color: '#06b6d4' },
  ];

  return (
    <div className="login-page">
      {/* Left Panel */}
      <div className="login-left">
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 440, textAlign: 'center' }}>
          <div style={{ fontSize: 72, marginBottom: 24 }}>🎓</div>
          <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16, lineHeight: 1.2 }}>
            Attend Pro
          </h1>
          <p style={{ fontSize: 16, opacity: 0.8, marginBottom: 40, lineHeight: 1.8 }}>
            A complete College Attendance Management System. Track students, manage attendance, and generate insightful reports — all in one place.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { icon: '👥', label: 'Students', value: '1,200+' },
              { icon: '📊', label: 'Reports', value: '50+ Types' },
              { icon: '🏛️', label: 'Departments', value: '6 Depts' },
            ].map(item => (
              <div key={item.label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 12px', backdropFilter: 'blur(8px)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{item.value}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="login-right">
        <div className="login-logo">🎓</div>

        {mode === 'login' ? (
          <>
            <h2 className="login-heading">Welcome Back</h2>
            <p className="login-sub">Sign in to your account to continue</p>

            {error && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: '#dc2626', fontSize: 13.5 }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <form className="login-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-group">
                  <Mail size={16} className="input-icon" />
                  <input
                    className="form-input"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-group">
                  <Lock size={16} className="input-icon" />
                  <input
                    className="form-input"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button type="button" className="input-suffix" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24, marginTop: -8 }}>
                <button type="button" style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 13, cursor: 'pointer', fontWeight: 500 }} onClick={() => { setMode('forgot'); setError(''); }}>
                  Forgot password?
                </button>
              </div>
              <button
                type="submit"
                className={`btn btn-primary btn-lg ${loading ? 'btn-loading' : ''}`}
                style={{ width: '100%', marginBottom: 24 }}
                disabled={loading}
              >
                {!loading && 'Sign In'}
              </button>
            </form>

            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div className="divider" style={{ flex: 1, margin: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Quick Access</span>
                <div className="divider" style={{ flex: 1, margin: 0 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {demoAccounts.map(acc => (
                  <button
                    key={acc.label}
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: 12, border: `1.5px solid ${acc.color}20` }}
                    onClick={() => { setEmail(acc.email); setPassword(acc.password); }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: acc.color, display: 'inline-block' }} />
                    {acc.label} Demo
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 className="login-heading">Reset Password</h2>
            <p className="login-sub">Enter your email to receive a reset link</p>
            {!forgotSent ? (
              <form className="login-form" onSubmit={handleForgot}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div className="input-group">
                    <Mail size={16} className="input-icon" />
                    <input className="form-input" type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  {error && <p className="form-error">{error}</p>}
                </div>
                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginBottom: 16 }}>Send Reset Link</button>
                <button type="button" className="btn btn-secondary btn-lg" style={{ width: '100%' }} onClick={() => { setMode('login'); setError(''); }}>Back to Login</button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', width: '100%' }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>📧</div>
                <p style={{ marginBottom: 24, color: 'var(--text-secondary)' }}>A reset link has been sent to <strong>{email}</strong></p>
                <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => { setMode('login'); setForgotSent(false); }}>Back to Login</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
