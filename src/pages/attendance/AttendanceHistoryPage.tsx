import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { attendanceService } from '../../services/attendanceService';
import { studentService } from '../../services/studentService';
import { departmentService } from '../../services/departmentService';
import { subjectService } from '../../services/subjectService';
import { Department } from '../../types';
import { useNavigate } from 'react-router-dom';

type HistoryView = 'student' | 'subject' | 'date';

export default function AttendanceHistoryPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<HistoryView>('student');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptId, setDeptId] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [studentStats, setStudentStats] = useState<any[]>([]);
  const [subjectStats, setSubjectStats] = useState<any[]>([]);
  const [dateStats, setDateStats] = useState<any[]>([]);

  useEffect(() => {
    setDepartments(departmentService.getAll());
  }, []);

  useEffect(() => {
    computeStats();
  }, [deptId, yearFilter, sectionFilter, subjectFilter, search, startDate, endDate, view]);

  const computeStats = () => {
    const allStudents = studentService.getAll();
    const allSubjects = subjectService.getAll();
    const allSessions = attendanceService.getAllSessions();
    const allRecords = attendanceService.getAllRecords();

    // Filter sessions
    let filteredSessions = allSessions;
    if (deptId) filteredSessions = filteredSessions.filter(s => s.departmentId === deptId);
    if (yearFilter) filteredSessions = filteredSessions.filter(s => s.year === Number(yearFilter));
    if (sectionFilter) filteredSessions = filteredSessions.filter(s => s.section === sectionFilter);
    if (subjectFilter) filteredSessions = filteredSessions.filter(s => s.subjectId === subjectFilter);
    if (startDate) filteredSessions = filteredSessions.filter(s => s.date >= startDate);
    if (endDate) filteredSessions = filteredSessions.filter(s => s.date <= endDate);

    const sessionIds = new Set(filteredSessions.map(s => s.id));
    const filteredRecords = allRecords.filter(r => sessionIds.has(r.sessionId));

    if (view === 'student') {
      const studentMap: Record<string, { present: number; absent: number }> = {};
      filteredRecords.forEach(r => {
        if (!studentMap[r.studentId]) studentMap[r.studentId] = { present: 0, absent: 0 };
        if (r.status === 'present') studentMap[r.studentId].present++;
        else studentMap[r.studentId].absent++;
      });
      const stats = Object.entries(studentMap).map(([sid, data]) => {
        const s = allStudents.find(st => st.id === sid);
        if (!s) return null;
        const total = data.present + data.absent;
        return {
          id: sid,
          name: s.name,
          registerNumber: s.registerNumber,
          departmentId: s.departmentId,
          present: data.present,
          absent: data.absent,
          total,
          percentage: total > 0 ? Math.round((data.present / total) * 100) : 0,
        };
      }).filter(Boolean).filter(s => {
        if (!search) return true;
        const q = search.toLowerCase();
        return s!.name.toLowerCase().includes(q) || s!.registerNumber.toLowerCase().includes(q);
      }) as any[];
      setStudentStats(stats.sort((a, b) => a.percentage - b.percentage));
    }

    if (view === 'subject') {
      const subMap: Record<string, { present: number; absent: number }> = {};
      filteredSessions.forEach(sess => {
        if (!subMap[sess.subjectId]) subMap[sess.subjectId] = { present: 0, absent: 0 };
        const recs = filteredRecords.filter(r => r.sessionId === sess.id);
        recs.forEach(r => {
          if (r.status === 'present') subMap[sess.subjectId].present++;
          else subMap[sess.subjectId].absent++;
        });
      });
      const stats = Object.entries(subMap).map(([subId, data]) => {
        const sub = allSubjects.find(s => s.id === subId);
        if (!sub) return null;
        const total = data.present + data.absent;
        return {
          id: subId,
          name: sub.name,
          code: sub.code,
          present: data.present,
          absent: data.absent,
          total,
          percentage: total > 0 ? Math.round((data.present / total) * 100) : 0,
        };
      }).filter(Boolean) as any[];
      setSubjectStats(stats);
    }

    if (view === 'date') {
      const dateMap: Record<string, { present: number; absent: number }> = {};
      filteredSessions.forEach(sess => {
        if (!dateMap[sess.date]) dateMap[sess.date] = { present: 0, absent: 0 };
        const recs = filteredRecords.filter(r => r.sessionId === sess.id);
        recs.forEach(r => {
          if (r.status === 'present') dateMap[sess.date].present++;
          else dateMap[sess.date].absent++;
        });
      });
      const stats = Object.entries(dateMap)
        .map(([date, data]) => {
          const total = data.present + data.absent;
          return { date, present: data.present, absent: data.absent, total, percentage: total > 0 ? Math.round((data.present / total) * 100) : 0 };
        })
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 30);
      setDateStats(stats);
    }
  };

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.code || '';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance History</h1>
          <p className="page-subtitle">Analyze attendance records by student, subject, or date</p>
        </div>
      </div>

      {/* View Tabs */}
      <div className="tabs" style={{ marginBottom: 20, maxWidth: 400 }}>
        {(['student', 'subject', 'date'] as const).map(v => (
          <button key={v} className={`tab-btn ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
            {v.charAt(0).toUpperCase() + v.slice(1)}-wise
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ paddingBottom: 16 }}>
          <div className="form-grid form-grid-3" style={{ gap: 12 }}>
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input className="form-input" placeholder="Search student…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-input form-select" value={deptId} onChange={e => setDeptId(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.code}</option>)}
            </select>
            <select className="form-input form-select" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
              <option value="">All Years</option>
              {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
            <select className="form-input form-select" value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}>
              <option value="">All Sections</option>
              {['A','B','C'].map(s => <option key={s} value={s}>Sec {s}</option>)}
            </select>
            <input className="form-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} placeholder="Start date" />
            <input className="form-input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} placeholder="End date" />
          </div>
        </div>
      </div>

      {/* Student-wise View */}
      {view === 'student' && (
        <>
          <div className="chart-wrapper" style={{ marginBottom: 20 }}>
            <div className="chart-title">Attendance Percentage Distribution</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={studentStats.slice(0, 15)} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="registerNumber" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 8 }} />
                <Bar dataKey="percentage" name="Attendance %" radius={[4, 4, 0, 0]}>
                  {studentStats.slice(0, 15).map((s, i) => (
                    <Cell key={i} fill={s.percentage >= 75 ? '#10b981' : s.percentage >= 60 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <div className="table-wrapper" style={{ border: 'none' }}>
              <table className="data-table">
                <thead><tr>
                  <th>Student</th><th>Reg No</th><th>Dept</th><th>Present</th><th>Absent</th><th>Total</th><th>Attendance %</th><th>Action</th>
                </tr></thead>
                <tbody>
                  {studentStats.length === 0 ? (
                    <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-text">No data for selected filters</div></div></td></tr>
                  ) : studentStats.map(s => (
                    <tr key={s.id}>
                      <td><div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div></td>
                      <td><code style={{ fontSize: 12, background: 'var(--bg-surface-2)', padding: '2px 6px', borderRadius: 4 }}>{s.registerNumber}</code></td>
                      <td><span className="badge badge-primary">{getDeptName(s.departmentId)}</span></td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>{s.present}</td>
                      <td style={{ color: '#ef4444', fontWeight: 600 }}>{s.absent}</td>
                      <td style={{ fontWeight: 600 }}>{s.total}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, color: s.percentage >= 75 ? '#10b981' : s.percentage >= 60 ? '#f59e0b' : '#ef4444', minWidth: 36 }}>{s.percentage}%</span>
                          <div className="progress-bar" style={{ flex: 1, minWidth: 80 }}>
                            <div className={`progress-fill ${s.percentage >= 75 ? 'high' : s.percentage >= 60 ? 'medium' : 'low'}`} style={{ width: `${s.percentage}%` }} />
                          </div>
                        </div>
                      </td>
                      <td><button className="btn btn-ghost btn-sm" onClick={() => navigate(`/students/${s.id}`)}>View Profile</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Subject-wise View */}
      {view === 'subject' && (
        <>
          <div className="chart-wrapper" style={{ marginBottom: 20 }}>
            <div className="chart-title">Subject-wise Attendance</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={subjectStats} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="code" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 8 }} />
                <Bar dataKey="present" name="Present" fill="#4f46e5" radius={[4,4,0,0]} />
                <Bar dataKey="absent" name="Absent" fill="#f87171" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <div className="table-wrapper" style={{ border: 'none' }}>
              <table className="data-table">
                <thead><tr><th>Subject</th><th>Code</th><th>Present</th><th>Absent</th><th>Total</th><th>Percentage</th></tr></thead>
                <tbody>
                  {subjectStats.length === 0
                    ? <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-text">No data</div></div></td></tr>
                    : subjectStats.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td><span className="badge badge-info">{s.code}</span></td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>{s.present}</td>
                      <td style={{ color: '#ef4444', fontWeight: 600 }}>{s.absent}</td>
                      <td>{s.total}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, color: s.percentage >= 75 ? '#10b981' : '#ef4444', minWidth: 36 }}>{s.percentage}%</span>
                          <div className="progress-bar" style={{ flex: 1, minWidth: 80 }}><div className={`progress-fill ${s.percentage >= 75 ? 'high' : 'low'}`} style={{ width: `${s.percentage}%` }} /></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Date-wise View */}
      {view === 'date' && (
        <>
          <div className="chart-wrapper" style={{ marginBottom: 20 }}>
            <div className="chart-title">Daily Attendance Trend</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={[...dateStats].reverse()} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 8 }} />
                <Bar dataKey="present" name="Present" fill="#4f46e5" radius={[4,4,0,0]} />
                <Bar dataKey="absent" name="Absent" fill="#f87171" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <div className="table-wrapper" style={{ border: 'none' }}>
              <table className="data-table">
                <thead><tr><th>Date</th><th>Present</th><th>Absent</th><th>Total</th><th>Percentage</th></tr></thead>
                <tbody>
                  {dateStats.length === 0
                    ? <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-text">No data</div></div></td></tr>
                    : dateStats.map(d => (
                    <tr key={d.date}>
                      <td style={{ fontWeight: 600 }}>{d.date}</td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>{d.present}</td>
                      <td style={{ color: '#ef4444', fontWeight: 600 }}>{d.absent}</td>
                      <td>{d.total}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, color: d.percentage >= 75 ? '#10b981' : '#ef4444', minWidth: 36 }}>{d.percentage}%</span>
                          <div className="progress-bar" style={{ flex: 1, minWidth: 80 }}><div className={`progress-fill ${d.percentage >= 75 ? 'high' : 'low'}`} style={{ width: `${d.percentage}%` }} /></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
