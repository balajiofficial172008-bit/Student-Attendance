import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { subjectService } from '../../services/subjectService';
import { departmentService } from '../../services/departmentService';
import { facultyService } from '../../services/facultyService';
import { Subject, Department, Faculty, SubjectFormData } from '../../types';
import toast from 'react-hot-toast';

function SubjectModal({ subject, departments, faculty, onSave, onClose }: any) {
  const { register, handleSubmit, formState: { errors } } = useForm<SubjectFormData>({
    defaultValues: subject ? {
      code: subject.code, name: subject.name, departmentId: subject.departmentId,
      semester: subject.semester, facultyId: subject.facultyId,
      credits: subject.credits, type: subject.type,
    } : { semester: 1, credits: 3, type: 'theory' }
  });
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{subject ? 'Edit Subject' : 'Add Subject'}</span>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit(onSave)}>
          <div className="modal-body">
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Subject Code <span style={{color:'red'}}>*</span></label>
                <input className={`form-input ${errors.code ? 'error' : ''}`} {...register('code', { required: 'Required' })} placeholder="e.g. CS301" />
                {errors.code && <p className="form-error">{errors.code.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Subject Name <span style={{color:'red'}}>*</span></label>
                <input className={`form-input ${errors.name ? 'error' : ''}`} {...register('name', { required: 'Required' })} placeholder="Full subject name" />
                {errors.name && <p className="form-error">{errors.name.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Department <span style={{color:'red'}}>*</span></label>
                <select className={`form-input form-select ${errors.departmentId ? 'error' : ''}`} {...register('departmentId', { required: 'Required' })}>
                  <option value="">Select Department</option>
                  {departments.map((d: Department) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Faculty</label>
                <select className="form-input form-select" {...register('facultyId')}>
                  <option value="">Unassigned</option>
                  {faculty.map((f: Faculty) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Semester <span style={{color:'red'}}>*</span></label>
                <select className="form-input form-select" {...register('semester', { valueAsNumber: true })}>
                  {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Credits</label>
                <input className="form-input" type="number" min={1} max={6} {...register('credits', { valueAsNumber: true })} />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-input form-select" {...register('type')}>
                  <option value="theory">Theory</option>
                  <option value="lab">Laboratory</option>
                  <option value="elective">Elective</option>
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{subject ? 'Update' : 'Add Subject'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = () => {
    setSubjects(subjectService.getAll());
    setDepartments(departmentService.getAll());
    setFaculty(facultyService.getAll());
  };
  useEffect(() => { load(); }, []);

  const filtered = subjects.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
    const matchDept = !deptFilter || s.departmentId === deptFilter;
    return matchSearch && matchDept;
  });

  const handleSave = (data: SubjectFormData) => {
    try {
      if (editSubject) { subjectService.update(editSubject.id, data); toast.success('Subject updated!'); }
      else { subjectService.create(data); toast.success('Subject added!'); }
      setShowModal(false); setEditSubject(null); load();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    subjectService.delete(deleteId);
    setDeleteId(null); load();
    toast.success('Subject deleted.');
  };

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.code || '—';
  const getFacultyName = (id?: string) => id ? (faculty.find(f => f.id === id)?.name || '—') : '—';

  const typeColors: Record<string, string> = { theory: 'badge-primary', lab: 'badge-success', elective: 'badge-warning' };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Subjects</h1><p className="page-subtitle">{filtered.length} subjects</p></div>
        <button className="btn btn-primary" onClick={() => { setEditSubject(null); setShowModal(true); }}><Plus size={16} />Add Subject</button>
      </div>
      <div className="search-filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input className="form-input" placeholder="Search subjects…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input form-select" style={{ width: 'auto', minWidth: 160 }} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.code}</option>)}
        </select>
      </div>
      <div className="card">
        <div className="table-wrapper" style={{ border: 'none' }}>
          <table className="data-table">
            <thead><tr><th>Code</th><th>Subject Name</th><th>Department</th><th>Semester</th><th>Faculty</th><th>Credits</th><th>Type</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon">📚</div><div className="empty-state-title">No Subjects Found</div></div></td></tr>
              ) : filtered.map(s => (
                <tr key={s.id}>
                  <td><code style={{ fontSize: 12, background: 'var(--bg-surface-2)', padding: '2px 6px', borderRadius: 4 }}>{s.code}</code></td>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td><span className="badge badge-primary">{getDeptName(s.departmentId)}</span></td>
                  <td>Sem {s.semester}</td>
                  <td style={{ fontSize: 13 }}>{getFacultyName(s.facultyId)}</td>
                  <td><span className="badge badge-gray">{s.credits} cr</span></td>
                  <td><span className={`badge ${typeColors[s.type] || 'badge-gray'}`}>{s.type}</span></td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditSubject(s); setShowModal(true); }}><Edit2 size={15} /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => setDeleteId(s.id)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && <SubjectModal subject={editSubject} departments={departments} faculty={faculty} onSave={handleSave} onClose={() => { setShowModal(false); setEditSubject(null); }} />}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="confirm-dialog">
              <div className="confirm-icon">🗑️</div>
              <div className="confirm-title">Delete Subject?</div>
              <div className="confirm-msg">This will remove the subject from the system.</div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
