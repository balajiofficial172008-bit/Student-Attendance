import React, { useState, useEffect, useCallback } from 'react';
import {
  Save, CheckCircle, XCircle, Users, RefreshCw,
  ChevronLeft, ChevronRight, Calendar, ClipboardList,
  Plus, X, UserPlus, TrendingUp,
} from 'lucide-react';
import { departmentService } from '../../services/departmentService';
import { subjectService } from '../../services/subjectService';
import { studentService } from '../../services/studentService';
import { attendanceService } from '../../services/attendanceService';
import { notificationService } from '../../services/notificationService';
import { Department, Subject, StudentFormData, AttendanceStatus, EligibilityPrediction } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Calculator, Award, AlertTriangle, Check, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface AttRow {
  studentId: string;
  name: string;
  registerNumber: string;
  status: AttendanceStatus;
  time: string;
  remarks?: string;
}
type ViewMode = 'day' | 'month';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const BLOOD_GROUPS = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];

const PERIODS = [
  { id: 0, label: 'Full Day (General)' },
  { id: 1, label: 'Period 1 (09:00 - 09:50 AM)' },
  { id: 2, label: 'Period 2 (09:50 - 10:40 AM)' },
  { id: 3, label: 'Period 3 (10:50 - 11:40 AM)' },
  { id: 4, label: 'Period 4 (11:40 - 12:30 PM)' },
  { id: 5, label: 'Period 5 (01:20 - 02:10 PM)' },
  { id: 6, label: 'Period 6 (02:10 - 03:00 PM)' },
  { id: 7, label: 'Period 7 (03:00 - 03:50 PM)' },
];

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function todayStr() { return new Date().toISOString().split('T')[0]; }

/* ══════════════════════════ MAIN PAGE ══════════════════════════ */
export default function AttendancePage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [deptId, setDeptId] = useState('');
  const [year, setYear] = useState('1');
  const [section, setSection] = useState('A');
  const [subjectId, setSubjectId] = useState('');
  const [period, setPeriod] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>('day');

  // day-view
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState<AttRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingSession, setExistingSession] = useState(false);

  // month-view
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calData, setCalData] = useState<Record<string, { present: number; absent: number; total: number }>>({});

  // add-student modal
  const [showAddStudent, setShowAddStudent] = useState(false);

  // Calculator modal
  const [calcStudent, setCalcStudent] = useState<AttRow | null>(null);
  const [calcTarget, setCalcTarget] = useState(75);
  const [calcPrediction, setCalcPrediction] = useState<EligibilityPrediction | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  useEffect(() => { setDepartments(departmentService.getAll()); }, []);

  useEffect(() => {
    if (deptId) { setSubjects(subjectService.getByDepartment(deptId)); setSubjectId(''); setLoaded(false); }
  }, [deptId]);

  const loadCalendarData = useCallback(() => {
    if (!deptId || !subjectId) return;
    const ms = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
    const sessions = attendanceService.getAllSessions().filter(
      (s) => s.departmentId === deptId && s.year === Number(year) &&
             s.section === section && s.subjectId === subjectId && s.date.startsWith(ms)
    );
    const map: Record<string, { present: number; absent: number; total: number }> = {};
    sessions.forEach((sess) => {
      const recs = attendanceService.getRecordsForSession(sess.id);
      const p = recs.filter((r) => r.status === 'present' || r.status === 'on_duty').length;
      map[sess.date] = { present: p, absent: recs.length - p, total: recs.length };
    });
    setCalData(map);
  }, [deptId, subjectId, year, section, calYear, calMonth]);

  useEffect(() => { if (viewMode === 'month') loadCalendarData(); }, [viewMode, loadCalendarData]);

  const loadAttendance = () => {
    if (!deptId || !subjectId || !date) { toast.error('Please fill all required fields.'); return; }
    const studs = studentService.getByDeptYearSection(deptId, Number(year), section);
    if (studs.length === 0) { toast.error('No students found for this class.'); return; }
    const existing = attendanceService.findSession(deptId, Number(year), section, subjectId, date, period === 0 ? undefined : period);
    const existRecs = existing ? attendanceService.getRecordsForSession(existing.id) : [];
    const t = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setRows(studs.map((s) => {
      const rec = existRecs.find((r) => r.studentId === s.id);
      return {
        studentId: s.id,
        name: s.name,
        registerNumber: s.registerNumber,
        status: rec ? (rec.status as AttendanceStatus) : 'present',
        time: rec?.time || t,
        remarks: rec?.remarks || '',
      };
    }));
    setExistingSession(!!existing);
    setLoaded(true);
  };

  const setRowStatus = (sid: string, status: AttendanceStatus) => {
    const t = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setRows((prev) => prev.map((r) =>
      r.studentId === sid
        ? {
            ...r,
            status,
            time: status === 'present' || status === 'late' || status === 'on_duty' ? t : '',
          }
        : r
    ));
  };

  const setRowRemark = (sid: string, remarks: string) => {
    setRows((prev) => prev.map((r) => r.studentId === sid ? { ...r, remarks } : r));
  };

  const markAll = (status: AttendanceStatus) => {
    const t = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setRows((prev) => prev.map((r) => ({
      ...r,
      status,
      time: status !== 'absent' ? t : '',
    })));
  };

  const openCalculator = async (row: AttRow) => {
    setCalcStudent(row);
    setCalcLoading(true);
    try {
      const pred = await attendanceService.predictEligibility(row.studentId, calcTarget);
      setCalcPrediction(pred);
    } catch {
      toast.error('Could not compute prediction');
    } finally {
      setCalcLoading(false);
    }
  };

  const handleTargetChange = async (target: number) => {
    setCalcTarget(target);
    if (calcStudent) {
      setCalcLoading(true);
      const pred = await attendanceService.predictEligibility(calcStudent.studentId, target);
      setCalcPrediction(pred);
      setCalcLoading(false);
    }
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const selectedPeriodObj = PERIODS.find(p => p.id === period);
      await attendanceService.saveAttendance(
        {
          departmentId: deptId,
          year: Number(year),
          section,
          subjectId,
          facultyId: user?.facultyId || 'f1',
          date,
          period: period > 0 ? period : undefined,
          periodLabel: selectedPeriodObj?.label,
        },
        rows.map((r) => ({ studentId: r.studentId, status: r.status, time: r.time, remarks: r.remarks })),
        user
      );

      const sub = subjects.find((s) => s.id === subjectId);
      if (user) {
        notificationService.create({
          userId: user.id,
          title: 'Attendance Recorded',
          message: `${sub?.name || 'Class'} (Sec ${section}) - ${selectedPeriodObj?.label || 'General'} on ${date} recorded.`,
          type: 'success',
        });
      }

      toast.success(`Attendance ${existingSession ? 'updated' : 'saved'} for ${rows.length} students!`);
      setExistingSession(true);
      if (viewMode === 'month') loadCalendarData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = rows.filter((r) => r.status === 'present').length;
  const onDutyCount = rows.filter((r) => r.status === 'on_duty').length;
  const lateCount = rows.filter((r) => r.status === 'late').length;
  const medicalCount = rows.filter((r) => r.status === 'medical_leave').length;
  const absentCount = rows.filter((r) => r.status === 'absent').length;

  const effectivePresent = presentCount + onDutyCount + medicalCount + (lateCount * 0.5);
  const pct = rows.length > 0 ? Math.round((effectivePresent / rows.length) * 100) : 0;

  const handleCalClick = (ds: string) => {
    if (ds > todayStr()) return;
    setDate(ds); setViewMode('day'); setLoaded(false); setRows([]);
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance Tracking</h1>
          <p className="page-subtitle">Multi-status period attendance marking with real-time academic credit calculations</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => setShowAddStudent(true)} id="btn-add-student">
            <UserPlus size={16} /> Add Student
          </button>
        </div>
      </div>

      {/* Class Filter */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">🎓 Class & Period Session Selection</span>
          {existingSession && loaded && <span className="badge badge-warning">⚠️ Editing existing record</span>}
        </div>
        <div className="card-body">
          <div className="form-grid form-grid-3" style={{ marginBottom: 0 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Department <span style={{ color: 'red' }}>*</span></label>
              <select className="form-input form-select" value={deptId} onChange={(e) => { setDeptId(e.target.value); setLoaded(false); }}>
                <option value="">Select Department</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Year <span style={{ color: 'red' }}>*</span></label>
              <select className="form-input form-select" value={year} onChange={(e) => { setYear(e.target.value); setLoaded(false); }}>
                {[1,2,3,4].map((y) => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Section <span style={{ color: 'red' }}>*</span></label>
              <select className="form-input form-select" value={section} onChange={(e) => { setSection(e.target.value); setLoaded(false); }}>
                {['A','B','C'].map((s) => <option key={s} value={s}>Section {s}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Subject <span style={{ color: 'red' }}>*</span></label>
              <select className="form-input form-select" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setLoaded(false); }}>
                <option value="">Select Subject</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.code} – {s.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Period / Hour Slot</label>
              <select className="form-input form-select" value={period} onChange={(e) => { setPeriod(Number(e.target.value)); setLoaded(false); }}>
                {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            {viewMode === 'day' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Date <span style={{ color: 'red' }}>*</span></label>
                <input className="form-input" type="date" value={date}
                  onChange={(e) => { setDate(e.target.value); setLoaded(false); }} max={todayStr()} />
              </div>
            )}
            {viewMode === 'day' && (
              <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'flex-end' }}>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={loadAttendance} id="btn-load-students">
                  <Users size={16} /> Load Students
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div style={{ display: 'flex', marginBottom: 20, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {(['day','month'] as ViewMode[]).map((m) => (
          <button key={m} id={`tab-${m}-view`}
            onClick={() => { setViewMode(m); if (m === 'month') loadCalendarData(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s', background: viewMode === m ? 'var(--color-primary)' : 'transparent', color: viewMode === m ? '#fff' : 'var(--text-muted)' }}
          >
            {m === 'day' ? <ClipboardList size={15} /> : <Calendar size={15} />}
            {m === 'day' ? 'Day View' : 'Month View'}
          </button>
        ))}
      </div>

      {/* ═══ DAY VIEW ═══ */}
      {viewMode === 'day' && (
        <>
          {loaded && rows.length > 0 && (
            <>
              {/* Stat Cards */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                {[
                  { count: presentCount, label: 'Present (P)', icon: <CheckCircle size={20} color="#059669" />, bg: 'linear-gradient(135deg,#d1fae5,#a7f3d0)', border: '#6ee7b7', color: '#059669', sub: '#065f46' },
                  { count: absentCount, label: 'Absent (A)', icon: <XCircle size={20} color="#dc2626" />, bg: 'linear-gradient(135deg,#fee2e2,#fecaca)', border: '#fca5a5', color: '#dc2626', sub: '#7f1d1d' },
                  { count: onDutyCount + medicalCount, label: 'OD / Medical', icon: <Award size={20} color="#2563eb" />, bg: 'linear-gradient(135deg,#dbeafe,#bfdbfe)', border: '#93c5fd', color: '#2563eb', sub: '#1e40af' },
                  { count: lateCount, label: 'Late (0.5 credit)', icon: <Clock size={20} color="#d97706" />, bg: 'linear-gradient(135deg,#fef3c7,#fde68a)', border: '#fcd34d', color: '#d97706', sub: '#92400e' },
                  { count: `${pct}%`, label: "Effective Rate", icon: <TrendingUp size={20} color="#7c3aed" />, bg: 'linear-gradient(135deg,#ede9fe,#ddd6fe)', border: '#c4b5fd', color: '#7c3aed', sub: '#4c1d95' },
                ].map((item) => (
                  <div key={item.label} style={{ background: item.bg, border: `1px solid ${item.border}`, borderRadius: 12, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 105 }}>
                    {item.icon}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 20, color: item.color, lineHeight: 1 }}>{item.count}</div>
                      <div style={{ fontSize: 11, color: item.sub, marginTop: 2 }}>{item.label}</div>
                    </div>
                  </div>
                ))}

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-success btn-sm" id="btn-mark-all-present" onClick={() => markAll('present')}><CheckCircle size={14} /> All Present</button>
                  <button className="btn btn-danger btn-sm" id="btn-mark-all-absent" onClick={() => markAll('absent')}><XCircle size={14} /> All Absent</button>
                </div>
              </div>

              <div className="card">
                <div className="table-wrapper" style={{ border: 'none' }}>
                  <table className="data-table">
                    <thead><tr>
                      <th>#</th>
                      <th>Register No.</th>
                      <th>Student Name</th>
                      <th>Current Status</th>
                      <th>Quick Status Actions</th>
                      <th>Remarks / Reason</th>
                      <th>Predictor</th>
                    </tr></thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={row.studentId} style={{
                          background: row.status === 'absent'
                            ? 'rgba(239,68,68,0.04)'
                            : row.status === 'on_duty'
                            ? 'rgba(37,99,235,0.04)'
                            : row.status === 'late'
                            ? 'rgba(245,158,11,0.04)'
                            : 'transparent',
                          transition: 'background 0.2s',
                        }}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                          <td><code style={{ fontSize: 12, background: 'var(--bg-surface-2)', padding: '2px 6px', borderRadius: 4 }}>{row.registerNumber}</code></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div className="avatar avatar-sm" style={{ background: `hsl(${row.name.charCodeAt(0) * 7 % 360},60%,52%)`, fontSize: 11 }}>
                                {row.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                              </div>
                              <span style={{ fontWeight: 600, fontSize: 13 }}>{row.name}</span>
                            </div>
                          </td>
                          <td>
                            {row.status === 'present' && <span className="status-present"><span className="status-dot present" />Present</span>}
                            {row.status === 'absent' && <span className="status-absent"><span className="status-dot absent" />Absent</span>}
                            {row.status === 'late' && <span className="badge badge-warning">⏰ Late (0.5)</span>}
                            {row.status === 'on_duty' && <span className="badge badge-primary">🎓 On-Duty (OD)</span>}
                            {row.status === 'medical_leave' && <span className="badge badge-info">🏥 Medical Leave</span>}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                type="button"
                                onClick={() => setRowStatus(row.studentId, 'present')}
                                title="Present"
                                style={{
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  background: row.status === 'present' ? '#10b981' : 'var(--bg-surface-2)',
                                  color: row.status === 'present' ? '#fff' : 'var(--text-muted)',
                                }}
                              >
                                P
                              </button>
                              <button
                                type="button"
                                onClick={() => setRowStatus(row.studentId, 'absent')}
                                title="Absent"
                                style={{
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  background: row.status === 'absent' ? '#ef4444' : 'var(--bg-surface-2)',
                                  color: row.status === 'absent' ? '#fff' : 'var(--text-muted)',
                                }}
                              >
                                A
                              </button>
                              <button
                                type="button"
                                onClick={() => setRowStatus(row.studentId, 'late')}
                                title="Late arrival"
                                style={{
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  background: row.status === 'late' ? '#f59e0b' : 'var(--bg-surface-2)',
                                  color: row.status === 'late' ? '#fff' : 'var(--text-muted)',
                                }}
                              >
                                L
                              </button>
                              <button
                                type="button"
                                onClick={() => setRowStatus(row.studentId, 'on_duty')}
                                title="On-Duty (Symposium, Sports)"
                                style={{
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  background: row.status === 'on_duty' ? '#2563eb' : 'var(--bg-surface-2)',
                                  color: row.status === 'on_duty' ? '#fff' : 'var(--text-muted)',
                                }}
                              >
                                OD
                              </button>
                              <button
                                type="button"
                                onClick={() => setRowStatus(row.studentId, 'medical_leave')}
                                title="Medical Leave"
                                style={{
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  background: row.status === 'medical_leave' ? '#6366f1' : 'var(--bg-surface-2)',
                                  color: row.status === 'medical_leave' ? '#fff' : 'var(--text-muted)',
                                }}
                              >
                                ML
                              </button>
                            </div>
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder="Notes (optional)..."
                              value={row.remarks || ''}
                              onChange={(e) => setRowRemark(row.studentId, e.target.value)}
                              className="form-input"
                              style={{ height: 30, fontSize: 11, minWidth: 130 }}
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => openCalculator(row)}
                              title="Calculate Detention Risk & Attendance Advice"
                              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                            >
                              <Calculator size={13} color="#6366f1" /> Check Risk
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button className="btn btn-secondary" id="btn-reset" onClick={() => { setLoaded(false); setRows([]); }}><RefreshCw size={15} /> Reset</button>
                  <button id="btn-save-attendance" className={`btn btn-primary ${saving ? 'btn-loading' : ''}`} onClick={saveAttendance} disabled={saving}>
                    {!saving && <><Save size={15} /> {existingSession ? 'Update Attendance' : 'Save Attendance Session'}</>}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Detention & Eligibility Calculator Modal */}
          {calcStudent && (
            <div className="modal-overlay">
              <div className="modal" style={{ maxWidth: 480 }}>
                <div className="modal-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Calculator size={18} />
                    </div>
                    <div>
                      <h3 className="modal-title" style={{ fontSize: 15 }}>Attendance Eligibility Predictor</h3>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {calcStudent.name} ({calcStudent.registerNumber})
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-icon" onClick={() => setCalcStudent(null)}>✕</button>
                </div>

                <div className="modal-body">
                  {calcLoading ? (
                    <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>Computing algorithms...</div>
                  ) : calcPrediction ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Target Threshold: {calcTarget}%</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {[75, 80, 85].map(t => (
                            <button
                              key={t}
                              className={`btn btn-sm ${calcTarget === t ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ padding: '2px 8px', fontSize: 11 }}
                              onClick={() => handleTargetChange(t)}
                            >
                              {t}%
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Score Highlight Card */}
                      <div style={{
                        background: calcPrediction.status === 'critical'
                          ? 'rgba(239, 68, 68, 0.08)'
                          : calcPrediction.status === 'warning'
                          ? 'rgba(245, 158, 11, 0.08)'
                          : 'rgba(16, 185, 129, 0.08)',
                        border: `1px solid ${calcPrediction.status === 'critical' ? '#fca5a5' : calcPrediction.status === 'warning' ? '#fde68a' : '#6ee7b7'}`,
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 16,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Current Standing</div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: calcPrediction.currentPercentage >= calcTarget ? '#10b981' : '#ef4444' }}>
                              {calcPrediction.currentPercentage}%
                            </div>
                          </div>
                          <span className={`badge ${calcPrediction.status === 'critical' ? 'badge-danger' : calcPrediction.status === 'warning' ? 'badge-warning' : 'badge-success'}`}>
                            {calcPrediction.status === 'critical' ? '⛔ CRITICAL DETENTION RISK' : calcPrediction.status === 'warning' ? '⚠️ WARNING ZONE' : '✅ SAFE & ELIGIBLE'}
                          </span>
                        </div>

                        <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.5, color: 'var(--text-primary)' }}>
                          <strong>Algorithmic Advice:</strong> {calcPrediction.advice}
                        </div>
                      </div>

                      {/* Stat Breakdown Grid */}
                      <div className="form-grid form-grid-2" style={{ marginBottom: 0 }}>
                        <div style={{ background: 'var(--bg-surface-2)', padding: 12, borderRadius: 8 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Conducted Hours</div>
                          <div style={{ fontSize: 18, fontWeight: 700 }}>{calcPrediction.totalConducted} classes</div>
                        </div>
                        <div style={{ background: 'var(--bg-surface-2)', padding: 12, borderRadius: 8 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Attended / Credit Hours</div>
                          <div style={{ fontSize: 18, fontWeight: 700 }}>{calcPrediction.totalAttended} classes</div>
                        </div>
                        <div style={{ background: 'var(--bg-surface-2)', padding: 12, borderRadius: 8 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Classes Needed to Reach {calcTarget}%</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#ef4444' }}>
                            {calcPrediction.classesNeededToReachTarget} consecutive
                          </div>
                        </div>
                        <div style={{ background: 'var(--bg-surface-2)', padding: 12, borderRadius: 8 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Safe Bunk Allowance</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>
                            {calcPrediction.classesCanSafelyMiss} classes
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setCalcStudent(null)}>Close</button>
                </div>
              </div>
            </div>
          )}
          {!loaded && (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-title">Ready to Mark Attendance</div>
                <div className="empty-state-text">Select department, year, section, subject and date — then click "Load Students"</div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ MONTH VIEW ═══ */}
      {viewMode === 'month' && (
        <MonthCalendar
          calYear={calYear} calMonth={calMonth} calData={calData}
          hasFilter={!!(deptId && subjectId)}
          onPrev={() => { const d = new Date(calYear, calMonth - 1, 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}
          onNext={() => { const d = new Date(calYear, calMonth + 1, 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}
          onDateClick={handleCalClick}
        />
      )}

      {showAddStudent && (
        <AddStudentModal
          departments={departments} defaultDeptId={deptId}
          defaultYear={Number(year)} defaultSection={section}
          onClose={() => setShowAddStudent(false)}
          onSaved={(msg) => { toast.success(msg); if (loaded) { setLoaded(false); setRows([]); } }}
          currentUser={user}
        />
      )}
    </div>
  );
}

/* ════════════════════ MONTH CALENDAR ════════════════════ */
function MonthCalendar({ calYear, calMonth, calData, hasFilter, onPrev, onNext, onDateClick }: {
  calYear: number; calMonth: number;
  calData: Record<string, { present: number; absent: number; total: number }>;
  hasFilter: boolean; onPrev: () => void; onNext: () => void; onDateClick: (d: string) => void;
}) {
  const today = todayStr();
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="card">
      <div className="card-header" style={{ justifyContent: 'space-between' }}>
        <button className="btn btn-ghost btn-icon btn-sm" id="btn-prev-month" onClick={onPrev}><ChevronLeft size={18} /></button>
        <span style={{ fontWeight: 700, fontSize: 16 }}>{MONTHS[calMonth]} {calYear}</span>
        <button className="btn btn-ghost btn-icon btn-sm" id="btn-next-month" onClick={onNext}><ChevronRight size={18} /></button>
      </div>
      {!hasFilter && (
        <div style={{ padding: '10px 20px', background: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border-color)', fontSize: 13, color: 'var(--text-muted)' }}>
          ⚠️ Select department &amp; subject above to see attendance data on the calendar.
        </div>
      )}
      <div style={{ display: 'flex', gap: 16, padding: '10px 20px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
        {[{ c: '#10b981', l: 'High ≥ 75%' }, { c: '#f59e0b', l: 'Medium 50–74%' }, { c: '#ef4444', l: 'Low < 50%' }].map(({ c, l }) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: c, display: 'inline-block' }} />{l}
          </span>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', padding: '8px 16px 0' }}>
        {DAYS.map((d) => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '6px 0', letterSpacing: 0.5 }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, padding: '6px 16px 16px' }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`e${idx}`} />;
          const ds = isoDate(calYear, calMonth, day);
          const isToday = ds === today;
          const isFuture = ds > today;
          const dow = new Date(calYear, calMonth, day).getDay();
          const isWknd = dow === 0 || dow === 6;
          const entry = calData[ds];
          const p = entry && entry.total > 0 ? Math.round((entry.present / entry.total) * 100) : null;
          const bg = p === null ? 'var(--bg-surface-2)' : p >= 75 ? 'linear-gradient(135deg,#d1fae5,#a7f3d0)' : p >= 50 ? 'linear-gradient(135deg,#fef3c7,#fde68a)' : 'linear-gradient(135deg,#fee2e2,#fecaca)';
          const bdr = isToday ? '2px solid var(--color-primary)' : p === null ? '1px solid var(--border-color)' : p >= 75 ? '1px solid #6ee7b7' : p >= 50 ? '1px solid #fcd34d' : '1px solid #fca5a5';
          const tc = p === null ? (isWknd ? 'var(--text-muted)' : 'var(--text-primary)') : p >= 75 ? '#065f46' : p >= 50 ? '#78350f' : '#7f1d1d';
          return (
            <div key={ds} id={`cal-day-${ds}`}
              onClick={() => !isFuture && !isWknd && onDateClick(ds)}
              style={{ borderRadius: 10, border: bdr, background: bg, padding: '8px 6px 6px', minHeight: 72, cursor: isFuture || isWknd ? 'default' : 'pointer', opacity: isFuture ? 0.38 : 1, transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={(e) => { if (!isFuture && !isWknd) { (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'; } }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
            >
              <div style={{ fontWeight: isToday ? 800 : 600, fontSize: 13, color: isToday ? 'var(--color-primary)' : tc, marginBottom: 2 }}>
                {day}{isToday && <span style={{ fontSize: 8, marginLeft: 4, background: 'var(--color-primary)', color: '#fff', borderRadius: 4, padding: '1px 4px', fontWeight: 700 }}>TODAY</span>}
              </div>
              {p !== null && entry && (
                <div style={{ fontSize: 10, color: tc }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{p}%</div>
                  <div><span style={{ color: '#059669' }}>✓{entry.present}</span> <span style={{ color: '#dc2626' }}>✗{entry.absent}</span></div>
                </div>
              )}
              {isWknd && p === null && <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>Weekend</div>}
            </div>
          );
        })}
      </div>
      <div style={{ padding: '8px 20px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
        💡 Click any past weekday to jump to Day View and mark or edit attendance.
      </div>
    </div>
  );
}

/* ════════════════════ ADD STUDENT MODAL ════════════════════ */
function AddStudentModal({ departments, defaultDeptId, defaultYear, defaultSection, onClose, onSaved, currentUser }: {
  departments: Department[]; defaultDeptId: string; defaultYear: number; defaultSection: string;
  onClose: () => void; onSaved: (msg: string) => void; currentUser: any;
}) {
  const [saving, setSaving] = useState(false);
  const admYear = new Date().getFullYear();
  const [form, setForm] = useState<StudentFormData>({
    registerNumber: '', name: '', email: '', phone: '', gender: 'male', dateOfBirth: '', address: '',
    departmentId: defaultDeptId || '', year: defaultYear || 1, semester: (defaultYear || 1) * 2,
    section: defaultSection || 'A', batch: `${admYear}-${admYear + 4}`, admissionYear: admYear,
    bloodGroup: 'O+', guardianName: '', guardianPhone: '', emergencyContact: '', enrollmentStatus: 'active',
  });
  const set = (k: keyof StudentFormData, v: any) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.registerNumber || !form.name || !form.email || !form.departmentId) { toast.error('Please fill all required fields.'); return; }
    setSaving(true);
    try {
      const student = studentService.create(form);
      if (currentUser) notificationService.create({ userId: currentUser.id, title: 'New Student Added', message: `${student.name} (${student.registerNumber}) enrolled.`, type: 'success' });
      onSaved(`${student.name} added successfully!`); onClose();
    } catch (err: any) { toast.error(err.message || 'Failed to add student.'); }
    finally { setSaving(false); }
  };

  const SectionLabel = ({ label }: { label: string }) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 14 }}>{label}</div>
  );

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal" style={{ maxWidth: 640, width: '95%', maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 1, borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserPlus size={20} color="var(--color-primary)" /> Add New Student
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Student will be available for attendance immediately after adding</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} id="btn-close-add-student"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ marginBottom: 24 }}>
              <SectionLabel label="📋 Basic Information" />
              <div className="form-grid form-grid-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Register Number <span style={{ color: 'red' }}>*</span></label>
                  <input className="form-input" placeholder="e.g. 20230001" value={form.registerNumber} onChange={(e) => set('registerNumber', e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Full Name <span style={{ color: 'red' }}>*</span></label>
                  <input className="form-input" placeholder="Student full name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email <span style={{ color: 'red' }}>*</span></label>
                  <input className="form-input" type="email" placeholder="student@college.edu" value={form.email} onChange={(e) => set('email', e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Phone</label>
                  <input className="form-input" placeholder="Mobile number" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Gender</label>
                  <select className="form-input form-select" value={form.gender} onChange={(e) => set('gender', e.target.value as any)}>
                    <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Date of Birth</label>
                  <input className="form-input" type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Blood Group</label>
                  <select className="form-input form-select" value={form.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)}>
                    {BLOOD_GROUPS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Enrollment Status</label>
                  <select className="form-input form-select" value={form.enrollmentStatus} onChange={(e) => set('enrollmentStatus', e.target.value as any)}>
                    <option value="active">Active</option><option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0, marginTop: 12 }}>
                <label className="form-label">Address</label>
                <input className="form-input" placeholder="Full address" value={form.address} onChange={(e) => set('address', e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <SectionLabel label="🎓 Academic Information" />
              <div className="form-grid form-grid-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Department <span style={{ color: 'red' }}>*</span></label>
                  <select className="form-input form-select" value={form.departmentId} onChange={(e) => set('departmentId', e.target.value)} required>
                    <option value="">Select Department</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Year</label>
                  <select className="form-input form-select" value={form.year} onChange={(e) => { const y = Number(e.target.value); set('year', y); set('semester', y * 2); }}>
                    {[1,2,3,4].map((y) => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Section</label>
                  <select className="form-input form-select" value={form.section} onChange={(e) => set('section', e.target.value)}>
                    {['A','B','C'].map((s) => <option key={s} value={s}>Section {s}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Semester</label>
                  <select className="form-input form-select" value={form.semester} onChange={(e) => set('semester', Number(e.target.value))}>
                    {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Admission Year</label>
                  <input className="form-input" type="number" min={2015} max={admYear} value={form.admissionYear}
                    onChange={(e) => { const y = Number(e.target.value); set('admissionYear', y); set('batch', `${y}-${y + 4}`); }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Batch</label>
                  <input className="form-input" placeholder="e.g. 2023-2027" value={form.batch} onChange={(e) => set('batch', e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <SectionLabel label="👨‍👩‍👦 Guardian Information" />
              <div className="form-grid form-grid-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Guardian Name</label>
                  <input className="form-input" placeholder="Parent / Guardian name" value={form.guardianName} onChange={(e) => set('guardianName', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Guardian Phone</label>
                  <input className="form-input" placeholder="Guardian contact" value={form.guardianPhone} onChange={(e) => set('guardianPhone', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Emergency Contact</label>
                  <input className="form-input" placeholder="Emergency number" value={form.emergencyContact} onChange={(e) => set('emergencyContact', e.target.value)} />
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" id="btn-confirm-add-student" className={`btn btn-primary ${saving ? 'btn-loading' : ''}`} disabled={saving}>
              {!saving && <><Plus size={15} /> Add Student</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
