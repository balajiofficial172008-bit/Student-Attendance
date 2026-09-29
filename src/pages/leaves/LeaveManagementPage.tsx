import React, { useState, useEffect } from 'react';
import {
  FileCheck, Clock, CheckCircle2, XCircle, Plus,
  Search, AlertCircle, Building2, Calendar, FileText
} from 'lucide-react';
import { leaveService } from '../../services/leaveService';
import { studentService } from '../../services/studentService';
import { departmentService } from '../../services/departmentService';
import { LeaveRequest, Student, Department } from '../../types';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function LeaveManagementPage() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [search, setSearch] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);

  // Form state
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [leaveType, setLeaveType] = useState<'on_duty' | 'medical_leave' | 'casual_leave'>('on_duty');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const data = await leaveService.getAll();
      setLeaves(data);
    } catch {
      toast.error('Failed to load leave records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
    setStudents(studentService.getAll());
    setDepartments(departmentService.getAll());
  }, []);

  const handleStatusUpdate = async (id: string, newStatus: 'approved' | 'rejected') => {
    try {
      await leaveService.updateStatus(id, newStatus, user);
      toast.success(
        newStatus === 'approved'
          ? 'Approved! Attendance records automatically synced to On-Duty/Medical Leave.'
          : 'Request marked as rejected.'
      );
      fetchLeaves();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !reason.trim() || !startDate || !endDate) {
      toast.error('Please complete all required fields.');
      return;
    }

    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    setSubmitting(true);
    try {
      await leaveService.apply(
        {
          studentId: student.id,
          studentName: student.name,
          registerNumber: student.registerNumber,
          departmentId: student.departmentId,
          type: leaveType,
          startDate,
          endDate,
          reason,
        },
        user
      );
      toast.success('Leave / OD request submitted successfully.');
      setShowApplyModal(false);
      setReason('');
      fetchLeaves();
    } catch (err: any) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLeaves = leaves.filter(l => {
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      l.studentName.toLowerCase().includes(q) ||
      l.registerNumber.toLowerCase().includes(q) ||
      l.reason.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const pendingCount = leaves.filter(l => l.status === 'pending').length;
  const approvedCount = leaves.filter(l => l.status === 'approved').length;
  const rejectedCount = leaves.filter(l => l.status === 'rejected').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave & On-Duty (OD) Management</h1>
          <p className="page-subtitle">
            Review, approve, and track student official duty & medical leaves with automatic attendance calculation
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowApplyModal(true)}>
            <Plus size={16} /> New Application
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={22} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{leaves.length}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Applications</div>
          </div>
        </div>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>{pendingCount}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pending Approvals</div>
          </div>
        </div>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>{approvedCount}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Approved (OD Active)</div>
          </div>
        </div>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <XCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444' }}>{rejectedCount}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rejected</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['all', 'pending', 'approved', 'rejected'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                style={{ textTransform: 'capitalize' }}
              >
                {st === 'all' ? 'All Applications' : st}
                {st === 'pending' && pendingCount > 0 && (
                  <span style={{ marginLeft: 6, background: '#ef4444', color: '#fff', borderRadius: '50%', padding: '1px 6px', fontSize: 10 }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', minWidth: 260 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search student, reg no, or reason..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: 36, height: 38 }}
            />
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Applications ({filteredLeaves.length})</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            💡 Approved OD applications automatically grant 100% attendance credit for the designated dates.
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading leave records...</div>
        ) : filteredLeaves.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No applications found</div>
            <div className="empty-state-text">There are no leave or OD requests matching your current filters.</div>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Info</th>
                  <th>Category</th>
                  <th>Date Range</th>
                  <th>Reason & Justification</th>
                  <th>Status</th>
                  <th>Reviewer</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map(leave => {
                  const dept = departments.find(d => d.id === leave.departmentId);
                  return (
                    <tr key={leave.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{leave.studentName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {leave.registerNumber} • {dept?.code || 'Dept'}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            leave.type === 'on_duty'
                              ? 'badge-primary'
                              : leave.type === 'medical_leave'
                              ? 'badge-warning'
                              : 'badge-info'
                          }`}
                        >
                          {leave.type === 'on_duty' ? 'On-Duty (OD)' : leave.type === 'medical_leave' ? 'Medical Leave' : 'Casual Leave'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <Calendar size={13} color="var(--text-muted)" />
                          <span>{leave.startDate}</span>
                          {leave.startDate !== leave.endDate && <span>→ {leave.endDate}</span>}
                        </div>
                      </td>
                      <td style={{ maxWidth: 260 }}>
                        <div style={{ fontSize: 12, lineHeight: 1.4 }}>{leave.reason}</div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            leave.status === 'approved'
                              ? 'badge-success'
                              : leave.status === 'rejected'
                              ? 'badge-danger'
                              : 'badge-warning'
                          }`}
                        >
                          {leave.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: 12 }}>{leave.approvedByName || '—'}</div>
                        {leave.approvedAt && (
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {new Date(leave.approvedAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td>
                        {leave.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleStatusUpdate(leave.id, 'approved')}
                              title="Approve and apply attendance credit"
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleStatusUpdate(leave.id, 'rejected')}
                              title="Reject application"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Application Modal */}
      {showApplyModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 className="modal-title">New Leave / On-Duty (OD) Application</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowApplyModal(false)}>✕</button>
            </div>
            <form onSubmit={handleApply}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Select Student <span style={{ color: 'red' }}>*</span></label>
                  <select
                    className="form-input form-select"
                    value={selectedStudentId}
                    onChange={e => setSelectedStudentId(e.target.value)}
                    required
                  >
                    <option value="">Choose Student...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.registerNumber} - Year {s.year}-{s.section})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Application Type <span style={{ color: 'red' }}>*</span></label>
                  <select
                    className="form-input form-select"
                    value={leaveType}
                    onChange={e => setLeaveType(e.target.value as any)}
                  >
                    <option value="on_duty">On-Duty (Symposium, Sports, Hackathon, Placement)</option>
                    <option value="medical_leave">Medical Leave (Doctor Verified)</option>
                    <option value="casual_leave">Casual / Personal Leave</option>
                  </select>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label">From Date <span style={{ color: 'red' }}>*</span></label>
                    <input
                      type="date"
                      className="form-input"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">To Date <span style={{ color: 'red' }}>*</span></label>
                    <input
                      type="date"
                      className="form-input"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      min={startDate}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Reason & Event Details <span style={{ color: 'red' }}>*</span></label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Provide detailed explanation or competition name..."
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowApplyModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
