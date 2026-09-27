import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Mail, Phone } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { facultyService } from '../../services/facultyService';
import { departmentService } from '../../services/departmentService';
import { Faculty, Department, FacultyFormData } from '../../types';
import toast from 'react-hot-toast';

function FacultyModal({ faculty, departments, onSave, onClose }: any) {
  const { register, handleSubmit, formState: { errors } } = useForm<FacultyFormData>({
    defaultValues: faculty ? {
      facultyId: faculty.facultyId, name: faculty.name, email: faculty.email,
      phone: faculty.phone, departmentId: faculty.departmentId,
      qualification: faculty.qualification, experience: faculty.experience,
      joiningDate: faculty.joiningDate, status: faculty.status,
    } : { status: 'active', joiningDate: new Date().toISOString().split('T')[0] }
  });
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{faculty ? 'Edit Faculty' : 'Add Faculty'}</span>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit(onSave)}>
          <div className="modal-body">
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Faculty ID <span style={{color:'red'}}>*</span></label>
                <input className={`form-input ${errors.facultyId ? 'error' : ''}`} {...register('facultyId', { required: 'Required' })} placeholder="e.g. FAC007" />
                {errors.facultyId && <p className="form-error">{errors.facultyId.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Full Name <span style={{color:'red'}}>*</span></label>
                <input className={`form-input ${errors.name ? 'error' : ''}`} {...register('name', { required: 'Required' })} placeholder="Dr. / Prof. Full Name" />
                {errors.name && <p className="form-error">{errors.name.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Email <span style={{color:'red'}}>*</span></label>
                <input className={`form-input ${errors.email ? 'error' : ''}`} type="email" {...register('email', { required: 'Required' })} placeholder="faculty@college.edu" />
                {errors.email && <p className="form-error">{errors.email.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Phone <span style={{color:'red'}}>*</span></label>
                <input className={`form-input ${errors.phone ? 'error' : ''}`} {...register('phone', { required: 'Required' })} placeholder="10-digit number" />
                {errors.phone && <p className="form-error">{errors.phone.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Department <span style={{color:'red'}}>*</span></label>
                <select className={`form-input form-select ${errors.departmentId ? 'error' : ''}`} {...register('departmentId', { required: 'Required' })}>
                  <option value="">Select Department</option>
                  {departments.map((d: Department) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input form-select" {...register('status')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Qualification</label>
                <input className="form-input" {...register('qualification')} placeholder="e.g. Ph.D Computer Science" />
              </div>
              <div className="form-group">
                <label className="form-label">Experience (years)</label>
                <input className="form-input" type="number" min={0} {...register('experience', { valueAsNumber: true })} />
              </div>
              <div className="form-group">
                <label className="form-label">Joining Date</label>
                <input className="form-input" type="date" {...register('joiningDate')} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{faculty ? 'Update' : 'Add Faculty'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FacultyPage() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editFaculty, setEditFaculty] = useState<Faculty | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = () => { setFaculty(facultyService.getAll()); setDepartments(departmentService.getAll()); };
  useEffect(() => { load(); }, []);

  const filtered = faculty.filter(f => {
    const q = search.toLowerCase();
    return (!q || f.name.toLowerCase().includes(q) || f.email.toLowerCase().includes(q) || f.facultyId.toLowerCase().includes(q))
      && (!deptFilter || f.departmentId === deptFilter);
  });

  const handleSave = (data: FacultyFormData) => {
    try {
      if (editFaculty) { facultyService.update(editFaculty.id, data); toast.success('Faculty updated!'); }
      else { facultyService.create(data); toast.success('Faculty added!'); }
      setShowModal(false); setEditFaculty(null); load();
    } catch (err: any) { toast.error(err.message); }
  };

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || '—';
  const getDeptCode = (id: string) => departments.find(d => d.id === id)?.code || '';

  const statusColor: Record<string, string> = { active: 'badge-success', inactive: 'badge-gray', on_leave: 'badge-warning' };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Faculty</h1><p className="page-subtitle">{filtered.length} faculty members</p></div>
        <button className="btn btn-primary" onClick={() => { setEditFaculty(null); setShowModal(true); }}><Plus size={16} />Add Faculty</button>
      </div>
      <div className="search-filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input className="form-input" placeholder="Search faculty…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input form-select" style={{ width: 'auto', minWidth: 160 }} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.code}</option>)}
        </select>
      </div>
      <div className="card">
        <div className="table-wrapper" style={{ border: 'none' }}>
          <table className="data-table">
            <thead><tr><th>Faculty</th><th>ID</th><th>Department</th><th>Contact</th><th>Qualification</th><th>Exp.</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon">👩‍🏫</div><div className="empty-state-title">No Faculty Found</div></div></td></tr>
              ) : filtered.map(f => (
                <tr key={f.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar avatar-sm" style={{ background: `hsl(${f.name.charCodeAt(0) * 7}, 55%, 50%)`, fontSize: 11 }}>
                        {f.name.split(' ').filter((n,i) => i > 0).map(n => n[0]).join('').slice(0,2)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{f.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><code style={{ fontSize: 12, background: 'var(--bg-surface-2)', padding: '2px 6px', borderRadius: 4 }}>{f.facultyId}</code></td>
                  <td><span className="badge badge-primary">{getDeptCode(f.departmentId)}</span></td>
                  <td><div style={{ fontSize: 12 }}><div style={{ display:'flex',alignItems:'center',gap:4 }}><Phone size={11}/>{f.phone}</div></div></td>
                  <td style={{ fontSize: 12, maxWidth: 160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.qualification || '—'}</td>
                  <td style={{ fontSize: 13 }}>{f.experience ? `${f.experience}y` : '—'}</td>
                  <td><span className={`badge ${statusColor[f.status]}`}>{f.status.replace('_', ' ')}</span></td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditFaculty(f); setShowModal(true); }}><Edit2 size={15} /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => setDeleteId(f.id)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && <FacultyModal faculty={editFaculty} departments={departments} onSave={handleSave} onClose={() => { setShowModal(false); setEditFaculty(null); }} />}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="confirm-dialog">
              <div className="confirm-icon">🗑️</div>
              <div className="confirm-title">Delete Faculty?</div>
              <div className="confirm-msg">This will remove the faculty member from the system.</div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => { facultyService.delete(deleteId!); setDeleteId(null); load(); toast.success('Deleted.'); }}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
