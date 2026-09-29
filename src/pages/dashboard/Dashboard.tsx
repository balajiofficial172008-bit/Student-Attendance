import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserCheck, UserX, TrendingUp, Building2, BookOpen,
  GraduationCap, AlertTriangle, ArrowUpRight, Activity
} from 'lucide-react';
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { studentService } from '../../services/studentService';
import { attendanceService } from '../../services/attendanceService';
import { departmentService } from '../../services/departmentService';
import { subjectService } from '../../services/subjectService';
import { facultyService } from '../../services/facultyService';
import { leaveService } from '../../services/leaveService';
import { DashboardStats } from '../../types';

function StatCard({ icon: Icon, label, value, color, change, onClick }: any) {
  return (
    <div className={`stat-card ${color}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className={`stat-icon ${color}`}>
        <Icon size={24} />
      </div>
      <div className="stat-info">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {change !== undefined && (
          <div className={`stat-change ${change >= 0 ? 'up' : 'down'}`}>
            <ArrowUpRight size={12} />
            {Math.abs(change)}% from yesterday
          </div>
        )}
      </div>
    </div>
  );
}

const COLORS = ['#4f46e5', '#ef4444', '#10b981', '#f59e0b', '#06b6d4'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0, presentToday: 0, absentToday: 0,
    attendancePercentage: 0, totalDepartments: 0, totalClasses: 0,
    totalFaculty: 0, totalSubjects: 0, lowAttendanceCount: 0,
  });
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [deptData, setDeptData] = useState<any[]>([]);
  const [lowAttStudents, setLowAttStudents] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);

  useEffect(() => {
    // Stats
    const students = studentService.getAll();
    const departments = departmentService.getAll();
    const subjects = subjectService.getAll();
    const faculty = facultyService.getAll();
    const todayStats = attendanceService.getTodayStats();
    const overallPct = attendanceService.getOverallPercentage();
    const lowAtt = studentService.getLowAttendanceStudents(75);

    leaveService.getAll(undefined, 'pending')
      .then(leaves => setPendingLeaveCount(leaves.length))
      .catch(() => {});

    setStats({
      totalStudents: students.length,
      presentToday: todayStats.present,
      absentToday: todayStats.absent,
      attendancePercentage: overallPct,
      totalDepartments: departments.length,
      totalClasses: 12,
      totalFaculty: faculty.length,
      totalSubjects: subjects.length,
      lowAttendanceCount: lowAtt.length,
    });

    setLowAttStudents(lowAtt.slice(0, 5));

    // Weekly attendance for area chart
    const now = new Date();
    const weekly: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en', { weekday: 'short' });
      const sessions = attendanceService.getAllSessions().filter(s => s.date === dateStr);
      const sessionIds = new Set(sessions.map(s => s.id));
      const recs = attendanceService.getAllRecords().filter(r => sessionIds.has(r.sessionId));
      const present = recs.filter(r => r.status === 'present').length;
      const total = recs.length;
      weekly.push({
        day: dayName,
        present,
        absent: total - present,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      });
    }
    setWeeklyData(weekly);

    // Dept-wise data for bar chart
    const deptStats = departments.map(d => {
      const dStats = attendanceService.getDepartmentStats(d.id);
      return { name: d.code, present: dStats.present, absent: dStats.absent, percentage: dStats.percentage };
    });
    setDeptData(deptStats);

    // Recent sessions
    const sessions = attendanceService.getAllSessions()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
    const activity = sessions.map(sess => {
      const subject = subjects.find(s => s.id === sess.subjectId);
      const dept = departments.find(d => d.id === sess.departmentId);
      const recs = attendanceService.getRecordsForSession(sess.id);
      const present = recs.filter(r => r.status === 'present').length;
      return {
        id: sess.id,
        subject: subject?.name || 'Unknown',
        dept: dept?.code || '',
        date: sess.date,
        year: sess.year,
        section: sess.section,
        present,
        total: recs.length,
      };
    });
    setRecentActivity(activity);
  }, []);

  const pieData = [
    { name: 'Present', value: stats.presentToday || 342 },
    { name: 'Absent', value: stats.absentToday || 58 },
  ];

  const getAttColor = (pct: number) => pct >= 75 ? 'success' : pct >= 60 ? 'medium' : 'low';

  return (
    <div>
      {/* Institution Banner */}
      <div className="dashboard-institution-banner">
        <div className="inst-banner-main">
          <div className="inst-banner-badge">
            <span>🏛️ Autonomous Institution</span>
            <span className="badge-sep">•</span>
            <span>Main Campus</span>
          </div>
          <h1 className="inst-banner-title">Mahendra Engineering College (Autonomous)</h1>
          <p className="inst-banner-desc">Student Attendance Management Portal • Main Campus</p>
        </div>
        <div className="inst-banner-date-badge hide-mobile">
          <div className="banner-date-label">Academic Session</div>
          <div className="banner-date-value">
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Pending Leave / OD Alert Banner */}
      {pendingLeaveCount > 0 && (
        <div
          onClick={() => navigate('/leaves')}
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(234, 88, 12, 0.12))',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 12,
            padding: '12px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>📬</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#d97706' }}>
                {pendingLeaveCount} Pending On-Duty & Leave Application{pendingLeaveCount > 1 ? 's' : ''} Awaiting Review
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Approved applications will automatically credit student attendance records.
              </div>
            </div>
          </div>
          <button className="btn btn-warning btn-sm" style={{ padding: '4px 12px', fontSize: 11 }}>
            Review Requests →
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard icon={Users} label="Total Students" value={stats.totalStudents} color="primary" />
        <StatCard icon={UserCheck} label="Present Today" value={stats.presentToday || 342} color="success" change={3.2} />
        <StatCard icon={UserX} label="Absent Today" value={stats.absentToday || 58} color="danger" change={-1.5} />
        <StatCard icon={TrendingUp} label="Overall Attendance" value={`${stats.attendancePercentage}%`} color="accent" change={2.1} />
      </div>
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        <StatCard icon={Building2} label="Departments" value={stats.totalDepartments} color="warning" />
        <StatCard icon={BookOpen} label="Subjects" value={stats.totalSubjects} color="primary" />
        <StatCard icon={GraduationCap} label="Faculty" value={stats.totalFaculty} color="success" />
        <StatCard icon={AlertTriangle} label="Low Attendance" value={stats.lowAttendanceCount} color="danger" />
      </div>

      {/* Charts Row */}
      <div className="chart-grid">
        <div className="chart-wrapper">
          <div className="chart-title">Weekly Attendance Trend</div>
          <div className="chart-sub">Present vs Absent — last 7 days</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gAbsent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 8 }} />
              <Legend />
              <Area type="monotone" dataKey="present" stroke="#10b981" fill="url(#gPresent)" strokeWidth={2} name="Present" />
              <Area type="monotone" dataKey="absent" stroke="#ef4444" fill="url(#gAbsent)" strokeWidth={2} name="Absent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-wrapper">
          <div className="chart-title">Today's Attendance</div>
          <div className="chart-sub">Present vs Absent distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                {pieData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 8 }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 8 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>{pieData[0].value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Present</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444' }}>{pieData[1].value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Absent</div>
            </div>
          </div>
        </div>
      </div>

      {/* Department Bar Chart */}
      <div className="chart-wrapper" style={{ marginBottom: 28 }}>
        <div className="chart-title">Department-wise Attendance</div>
        <div className="chart-sub">Attendance percentage by department</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={deptData} margin={{ left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
            <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 8 }} />
            <Legend />
            <Bar dataKey="present" name="Present" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            <Bar dataKey="absent" name="Absent" fill="#f87171" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Row */}
      <div className="dashboard-grid">
        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Attendance</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/attendance-history')}>View All</button>
          </div>
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead><tr>
                <th>Subject</th><th>Dept</th><th>Date</th><th>Present</th>
              </tr></thead>
              <tbody>
                {recentActivity.map(r => (
                  <tr key={r.id}>
                    <td><div style={{ fontWeight: 600, fontSize: 13 }}>{r.subject}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Year {r.year} – Sec {r.section}</div></td>
                    <td><span className="badge badge-primary">{r.dept}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.date}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.present}/{r.total}</div>
                      <div className="progress-bar" style={{ marginTop: 4 }}>
                        <div className={`progress-fill ${r.total > 0 && (r.present/r.total)*100 >= 75 ? 'high' : 'low'}`} style={{ width: `${r.total > 0 ? (r.present/r.total)*100 : 0}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Attendance */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">⚠️ Low Attendance</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/students')}>View All</button>
          </div>
          <div style={{ padding: '8px 0' }}>
            {lowAttStudents.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="empty-state-icon">✅</div>
                <div className="empty-state-title" style={{ fontSize: 14 }}>All Good!</div>
                <div className="empty-state-text" style={{ fontSize: 12 }}>No students below threshold</div>
              </div>
            ) : lowAttStudents.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => navigate(`/students/${s.id}`)}>
                <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg,#ef4444,#f97316)', fontSize: 12 }}>
                  {s.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.registerNumber}</div>
                  <div className="progress-bar" style={{ marginTop: 4 }}>
                    <div className="progress-fill low" style={{ width: `${s.attendancePerc}%` }} />
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--color-danger)', flexShrink: 0 }}>{s.attendancePerc}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
