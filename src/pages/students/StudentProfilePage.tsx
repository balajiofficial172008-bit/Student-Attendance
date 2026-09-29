import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Edit2, BookOpen } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { studentService } from '../../services/studentService';
import { departmentService } from '../../services/departmentService';
import { attendanceService } from '../../services/attendanceService';
import { subjectService } from '../../services/subjectService';
import { Student, Department, Subject, AttendanceStatus } from '../../types';
import StudentFormModal from './StudentFormModal';
import toast from 'react-hot-toast';

export default function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [subjectStats, setSubjectStats] = useState<any[]>([]);
  const [calendar, setCalendar] = useState<Record<string, AttendanceStatus>>({});
  const [showEdit, setShowEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'calendar'>('overview');

  const load = () => {
    if (!id) return;
    const s = studentService.getById(id);
    if (!s) { navigate('/students'); return; }
    setStudent(s);
    setDepartment(departmentService.getById(s.departmentId) || null);
    const allSubjects = subjectService.getByDepartment(s.departmentId);
    setSubjects(allSubjects);
    const summ = studentService.getAttendanceSummary(s.id);
    setSummary(summ);
    const cal = attendanceService.getStudentCalendar(s.id);
    setCalendar(cal);
    const stats = allSubjects.map(sub => {
      const subSumm = studentService.getAttendanceSummary(s.id, sub.id);
      return { name: sub.code, present: subSumm.presentDays, absent: subSumm.absentDays, percentage: subSumm.percentage, total: subSumm.totalDays };
    }).filter(s => s.total > 0);
    setSubjectStats(stats);
  };

  useEffect(() => { load(); }, [id]);

  if (!student) return <div className="empty-state"><div className="empty-state-icon">🔍</div><div className="empty-state-title">Student Not Found</div></div>;

  const initials = student.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const pct = summary?.percentage ?? 0;
  const pieData = [
    { name: 'Present', value: summary?.presentDays || 0 },
    { name: 'Absent', value: summary?.absentDays || 0 },
  ];

  // Calendar grid
  const now = new Date();
  const calYear = now.getFullYear();
  const calMonth = now.getMonth();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calDays: ({ day: number; status?: AttendanceStatus } | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calDays.push({ day: d, status: calendar[dateStr] });
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/students')}><ArrowLeft size={16} /> Back to Students</button>
      </div>

      {/* Profile Header */}
      <div className="card" style={{ marginBottom: 24, overflow: 'hidden' }}>
        <div className="profile-header">
          <div className="avatar avatar-xl" style={{ background: `hsl(${student.name.charCodeAt(0) * 5}, 65%, 55%)` }}>{initials}</div>
          <div style={{ flex: 1 }}>
            <div className="profile-name">{student.name}</div>
            <div className="profile-info">{student.registerNumber} • {department?.name}</div>
            <div className="profile-tags">
              <span className="profile-tag">Year {student.year}</span>
              <span className="profile-tag">Sem {student.semester}</span>
              <span className="profile-tag">Sec {student.section}</span>
              <span className="profile-tag">{student.batch}</span>
              <span className="profile-tag">{student.enrollmentStatus}</span>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: pct >= 75 ? '#34d399' : pct >= 60 ? '#fbbf24' : '#f87171' }}>{pct}%</div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>Overall Attendance</div>
            {pct < 75 && <span style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>⚠️ Below Threshold</span>}
          </div>
          <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setShowEdit(true)}><Edit2 size={14} /> Edit</button>
        </div>

        {/* Tabs */}
        <div style={{ padding: '0 24px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', gap: 0 }}>
            {(['overview', 'attendance', 'calendar'] as const).map(t => (
              <button key={t} style={{ padding: '14px 20px', background: 'none', border: 'none', borderBottom: activeTab === t ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === t ? 'var(--color-primary)' : 'var(--text-secondary)', fontWeight: activeTab === t ? 700 : 500, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize', transition: 'var(--transition)' }} onClick={() => setActiveTab(t)}>{t}</button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="profile-detail-grid">
            {[
              { label: 'Email', value: student.email, icon: <Mail size={14} /> },
              { label: 'Phone', value: student.phone, icon: <Phone size={14} /> },
              { label: 'Date of Birth', value: student.dateOfBirth, icon: <Calendar size={14} /> },
              { label: 'Blood Group', value: student.bloodGroup },
              { label: 'Gender', value: student.gender, style: { textTransform: 'capitalize' } },
              { label: 'Admission Year', value: String(student.admissionYear) },
              { label: 'Address', value: student.address, icon: <MapPin size={14} /> },
              { label: 'Guardian Name', value: student.guardianName },
              { label: 'Guardian Phone', value: student.guardianPhone },
              { label: 'Emergency Contact', value: student.emergencyContact },
              { label: 'Department', value: department?.name || '—' },
              { label: 'HOD', value: department?.hodName || '—' },
            ].map(item => (
              <div key={item.label} className="detail-item">
                <label>{item.label}</label>
                <p style={(item as any).style}>{item.value || '—'}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
              {[
                { label: 'Total Classes', value: summary?.totalDays || 0, color: '#4f46e5' },
                { label: 'Present', value: summary?.presentDays || 0, color: '#10b981' },
                { label: 'Absent', value: summary?.absentDays || 0, color: '#ef4444' },
                { label: 'Percentage', value: `${pct}%`, color: pct >= 75 ? '#10b981' : '#ef4444' },
              ].map(item => (
                <div key={item.label} style={{ background: 'var(--bg-surface-2)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{item.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <h4 style={{ fontWeight: 700, marginBottom: 12 }}>Overall Distribution</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 style={{ fontWeight: 700, marginBottom: 12 }}>Subject-wise Attendance</h4>
                {subjectStats.length === 0 ? (
                  <div className="empty-state" style={{ padding: 20 }}><div className="empty-state-text">No attendance data</div></div>
                ) : subjectStats.map(s => (
                  <div key={s.name} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{s.name}</span>
                      <span style={{ fontWeight: 700, color: s.percentage >= 75 ? '#10b981' : '#ef4444' }}>{s.percentage}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className={`progress-fill ${s.percentage >= 75 ? 'high' : s.percentage >= 60 ? 'medium' : 'low'}`} style={{ width: `${s.percentage}%` }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.present}/{s.total} classes</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div style={{ padding: 24 }}>
            <h4 style={{ fontWeight: 700, marginBottom: 4 }}>{now.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</h4>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Attendance calendar view</p>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
              {[{ color: '#10b981', bg: '#d1fae5', label: 'Present' }, { color: '#ef4444', bg: '#fee2e2', label: 'Absent' }, { color: 'var(--text-muted)', bg: 'var(--bg-surface-2)', label: 'No class' }].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, background: l.bg, border: `1px solid ${l.color}40` }} />
                  {l.label}
                </div>
              ))}
            </div>
            <div className="calendar-grid">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="calendar-day header">{d}</div>
              ))}
              {calDays.map((d, i) => (
                <div key={i} className={`calendar-day ${d?.status || ''} ${!d ? 'other-month' : ''} ${d?.day === now.getDate() ? 'today' : ''}`}>
                  {d?.day || ''}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showEdit && student && (
        <StudentFormModal
          student={student}
          departments={[department!].filter(Boolean)}
          onSave={(data) => {
            studentService.update(student.id, data);
            toast.success('Student updated!');
            setShowEdit(false);
            load();
          }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}
