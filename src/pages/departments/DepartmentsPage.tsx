import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, GraduationCap, BookOpen } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { departmentService } from '../../services/departmentService';
import { studentService } from '../../services/studentService';
import { facultyService } from '../../services/facultyService';
import { subjectService } from '../../services/subjectService';
import { attendanceService } from '../../services/attendanceService';
import { Department, DepartmentFormData } from '../../types';
import toast from 'react-hot-toast';

function DeptModal({ dept, onSave, onClose }: any) {
  const { register, handleSubmit, formState: { errors } } = useForm<DepartmentFormData>({
    defaultValues: dept ? { name: dept.name, code: dept.code, hodName: dept.hodName, hodEmail: dept.hodEmail, description: dept.description } : {}
  });
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{dept ? 'Edit Department' : 'Add Department'}</span>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit(onSave)}>
          <div className="modal-body">
            <div className="form-grid form-grid-2">
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Department Name <span style={{color:'red'}}>*</span></label>
                <input className={`form-input ${errors.name ? 'error':''}`} {...register('name', { required: 'Required' })} placeholder="e.g. Computer Science and Engineering" />
                {errors.name && <p className="form-error">{errors.name.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Department Code <span style={{color:'red'}}>*</span></label>
                <input className={`form-input ${errors.code ? 'error':''}`} {...register('code', { required: 'Required' })} placeholder="e.g. CSE" />
                {errors.code && <p className="form-error">{errors.code.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">HOD Name <span style={{color:'red'}}>*</span></label>
                <input className={`form-input ${errors.hodName ? 'error':''}`} {...register('hodName', { required: 'Required' })} placeholder="Dr. Full Name" />
                {errors.hodName && <p className="form-error">{errors.hodName.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">HOD Email</label>
                <input className="form-input" type="email" {...register('hodEmail')} placeholder="hod@college.edu" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-input" {...register('description')} placeholder="Short description" />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{dept ? 'Update' : 'Add Department'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const deptIcons: Record<string, string> = { CSE:'💻', IT:'🌐', ECE:'📡', ME:'⚙️', CE:'🏗️', AIDS:'🤖' };

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptStats, setDeptStats] = useState<Record<string, any>>({});
  const [showModal, setShowModal] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = () => {
    const depts = departmentService.getAll();
    setDepartments(depts);
    const stats: Record<string, any> = {};
    depts.forEach(d => {
      const students = studentService.getAll().filter(s => s.departmentId === d.id);
      const faculty = facultyService.getAll().filter(f => f.departmentId === d.id);
      const subjects = subjectService.getAll().filter(s => s.departmentId === d.id);
      const attStats = attendanceService.getDepartmentStats(d.id);
      stats[d.id] = { students: students.length, faculty: faculty.length, subjects: subjects.length, ...attStats };
    });
    setDeptStats(stats);
  };
  useEffect(() => { load(); }, []);

  const handleSave = (data: DepartmentFormData) => {
    try {
      if (editDept) { departmentService.update(editDept.id, data); toast.success('Department updated!'); }
      else { departmentService.create(data); toast.success('Department added!'); }
      setShowModal(false); setEditDept(null); load();
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Departments</h1><p className="page-subtitle">{departments.length} departments</p></div>
        <button className="btn btn-primary" onClick={() => { setEditDept(null); setShowModal(true); }}><Plus size={16} />Add Department</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
        {departments.map(dept => {
          const stats = deptStats[dept.id] || {};
          const pct = stats.percentage || 0;
          return (
            <div key={dept.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', padding: '20px 24px', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                  <div style={{ fontSize: 36 }}>{deptIcons[dept.code] || '🏫'}</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{dept.code}</div>
                    <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.3 }}>{dept.name}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: '#fff', background: 'rgba(255,255,255,0.15)' }} onClick={() => { setEditDept(dept); setShowModal(true); }}><Edit2 size={14} /></button>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: '#fff', background: 'rgba(255,255,255,0.15)' }} onClick={() => setDeleteId(dept.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>HOD: {dept.hodName}</div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
                  {[
                    { icon: <Users size={15}/>, label: 'Students', value: stats.students || 0, color: '#4f46e5' },
                    { icon: <GraduationCap size={15}/>, label: 'Faculty', value: stats.faculty || 0, color: '#10b981' },
                    { icon: <BookOpen size={15}/>, label: 'Subjects', value: stats.subjects || 0, color: '#06b6d4' },
                  ].map(item => (
                    <div key={item.label} style={{ textAlign: 'center', background: 'var(--bg-surface-2)', borderRadius: 8, padding: '10px 8px' }}>
                      <div style={{ color: item.color, marginBottom: 4 }}>{item.icon}</div>
                      <div style={{ fontWeight: 800, fontSize: 18 }}>{item.value}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Attendance</span>
                    <span style={{ fontWeight: 700, color: pct >= 75 ? '#10b981' : '#ef4444' }}>{pct}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className={`progress-fill ${pct >= 75 ? 'high' : pct >= 60 ? 'medium' : 'low'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {showModal && <DeptModal dept={editDept} onSave={handleSave} onClose={() => { setShowModal(false); setEditDept(null); }} />}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="confirm-dialog">
              <div className="confirm-icon">🏛️</div>
              <div className="confirm-title">Delete Department?</div>
              <div className="confirm-msg">This will permanently remove the department.</div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => { departmentService.delete(deleteId!); setDeleteId(null); load(); toast.success('Deleted.'); }}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
