import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Edit2, Trash2, Filter, Download, UserCheck, Calculator, Upload } from 'lucide-react';
import { studentService } from '../../services/studentService';
import { departmentService } from '../../services/departmentService';
import { notificationService } from '../../services/notificationService';
import { attendanceService } from '../../services/attendanceService';
import { Student, Department, EligibilityPrediction } from '../../types';
import StudentFormModal from './StudentFormModal';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function StudentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'defaulters' | 'critical' | 'safe'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Calculator Modal
  const [calcStudent, setCalcStudent] = useState<Student | null>(null);
  const [calcTarget, setCalcTarget] = useState(75);
  const [calcPrediction, setCalcPrediction] = useState<EligibilityPrediction | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const load = () => {
    setStudents(studentService.getAll());
    setDepartments(departmentService.getAll());
  };

  useEffect(() => { load(); }, []);

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.registerNumber.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    const matchDept = !deptFilter || s.departmentId === deptFilter;
    const matchYear = !yearFilter || s.year === Number(yearFilter);
    const matchSection = !sectionFilter || s.section === sectionFilter;
    const matchStatus = !statusFilter || s.enrollmentStatus === statusFilter;

    const pct = s.attendancePercentage ?? 0;
    let matchRisk = true;
    if (riskFilter === 'defaulters') matchRisk = pct < 75;
    else if (riskFilter === 'critical') matchRisk = pct < 60;
    else if (riskFilter === 'safe') matchRisk = pct >= 75;

    return matchSearch && matchDept && matchYear && matchSection && matchStatus && matchRisk;
  });

  const openCalculator = async (s: Student) => {
    setCalcStudent(s);
    setCalcLoading(true);
    try {
      const pred = await attendanceService.predictEligibility(s.id, calcTarget);
      setCalcPrediction(pred);
    } catch {
      toast.error('Prediction failed');
    } finally {
      setCalcLoading(false);
    }
  };

  const handleTargetChange = async (t: number) => {
    setCalcTarget(t);
    if (calcStudent) {
      setCalcLoading(true);
      const pred = await attendanceService.predictEligibility(calcStudent.id, t);
      setCalcPrediction(pred);
      setCalcLoading(false);
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    studentService.delete(deleteId);
    setShowDeleteConfirm(false);
    setDeleteId(null);
    load();
    toast.success('Student deleted successfully.');
  };

  const handleSave = (data: any) => {
    if (editStudent) {
      studentService.update(editStudent.id, data);
      toast.success('Student updated successfully.');
    } else {
      studentService.create(data);
      if (user) notificationService.create({ userId: user.id, title: 'New Student Added', message: `${data.name} has been enrolled.`, type: 'success' });
      toast.success('Student added successfully.');
    }
    setShowModal(false);
    setEditStudent(null);
    load();
  };

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.code || '—';

  const getAttPct = (s: Student) => s.attendancePercentage ?? 0;
  const getAttColor = (pct: number) => pct >= 75 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';

  const exportCSV = () => {
    const rows = [['Reg No', 'Name', 'Dept', 'Year', 'Sec', 'Email', 'Phone', 'Status', 'Attendance%']];
    filtered.forEach(s => rows.push([s.registerNumber, s.name, getDeptName(s.departmentId), String(s.year), s.section, s.email, s.phone, s.enrollmentStatus, String(getAttPct(s))]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'students.csv'; a.click();
    toast.success('CSV exported!');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">{filtered.length} of {students.length} students</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={exportCSV}><Download size={16} />Export CSV</button>
          <button className="btn btn-primary" onClick={() => { setEditStudent(null); setShowModal(true); }}><Plus size={16} />Add Student</button>
        </div>
      </div>

      {/* Risk Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { key: 'all', label: 'All Students', count: students.length },
          { key: 'defaulters', label: '⚠️ Defaulters (< 75%)', count: students.filter(s => (s.attendancePercentage ?? 0) < 75).length },
          { key: 'critical', label: '⛔ Critical (< 60%)', count: students.filter(s => (s.attendancePercentage ?? 0) < 60).length },
          { key: 'safe', label: '✅ Eligible (≥ 75%)', count: students.filter(s => (s.attendancePercentage ?? 0) >= 75).length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setRiskFilter(tab.key as any)}
            className={`btn btn-sm ${riskFilter === tab.key ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            {tab.label} <span style={{ opacity: 0.75, marginLeft: 4 }}>({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="search-filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input className="form-input" placeholder="Search by name, register number, email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input form-select" style={{ width: 'auto', minWidth: 140 }} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.code}</option>)}
        </select>
        <select className="form-input form-select" style={{ width: 'auto', minWidth: 110 }} value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
          <option value="">All Years</option>
          {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
        </select>
        <select className="form-input form-select" style={{ width: 'auto', minWidth: 110 }} value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}>
          <option value="">All Sections</option>
          {['A','B','C'].map(s => <option key={s} value={s}>Section {s}</option>)}
        </select>
        <select className="form-input form-select" style={{ width: 'auto', minWidth: 110 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {(search || deptFilter || yearFilter || sectionFilter || statusFilter) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setDeptFilter(''); setYearFilter(''); setSectionFilter(''); setStatusFilter(''); }}>Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper" style={{ border: 'none' }}>
          <table className="data-table">
            <thead><tr>
              <th>Student</th><th>Reg No.</th><th>Department</th>
              <th>Year / Section</th><th>Attendance</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon">👥</div>
                    <div className="empty-state-title">No Students Found</div>
                    <div className="empty-state-text">Try adjusting your search or filters</div>
                  </div>
                </td></tr>
              ) : filtered.map(s => {
                const pct = getAttPct(s);
                return (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar avatar-sm" style={{ background: `hsl(${s.name.charCodeAt(0) * 5}, 65%, 55%)`, fontSize: 11 }}>
                          {s.name.split(' ').map(n => n[0]).slice(0,2).join('')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><code style={{ fontSize: 12, background: 'var(--bg-surface-2)', padding: '2px 6px', borderRadius: 4 }}>{s.registerNumber}</code></td>
                    <td><span className="badge badge-primary">{getDeptName(s.departmentId)}</span></td>
                    <td>Year {s.year} / Sec {s.section}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontWeight: 700, color: getAttColor(pct), minWidth: 36 }}>{pct}%</div>
                        <div className="progress-bar" style={{ flex: 1, minWidth: 60 }}>
                          <div className={`progress-fill ${pct >= 75 ? 'high' : pct >= 60 ? 'medium' : 'low'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${s.enrollmentStatus === 'active' ? 'badge-success' : 'badge-gray'}`}>
                        {s.enrollmentStatus}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-ghost btn-icon btn-sm" title="Detention Risk Predictor" onClick={() => openCalculator(s)}>
                          <Calculator size={15} color="#6366f1" />
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="View Profile" onClick={() => navigate(`/students/${s.id}`)}><Eye size={15} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => { setEditStudent(s); setShowModal(true); }}><Edit2 size={15} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Delete" style={{ color: 'var(--color-danger)' }} onClick={() => { setDeleteId(s.id); setShowDeleteConfirm(true); }}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <StudentFormModal
          student={editStudent}
          departments={departments}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditStudent(null); }}
        />
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="confirm-dialog">
              <div className="confirm-icon">🗑️</div>
              <div className="confirm-title">Delete Student?</div>
              <div className="confirm-msg">This action cannot be undone. All attendance records for this student will also be removed.</div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detention & Eligibility Calculator Modal */}
      {calcStudent && (
        <div className="modal-overlay" onClick={() => setCalcStudent(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calculator size={18} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ fontSize: 15 }}>Detention Risk & Eligibility Predictor</h3>
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
    </div>
  );
}
