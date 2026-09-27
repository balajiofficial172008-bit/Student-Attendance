import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Student, Department, StudentFormData } from '../../types';

interface Props {
  student: Student | null;
  departments: Department[];
  onSave: (data: StudentFormData) => void;
  onClose: () => void;
}

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export default function StudentFormModal({ student, departments, onSave, onClose }: Props) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<StudentFormData>({
    defaultValues: student ? {
      registerNumber: student.registerNumber,
      name: student.name, email: student.email, phone: student.phone,
      gender: student.gender, dateOfBirth: student.dateOfBirth,
      address: student.address, departmentId: student.departmentId,
      year: student.year, semester: student.semester, section: student.section,
      batch: student.batch, admissionYear: student.admissionYear,
      bloodGroup: student.bloodGroup, guardianName: student.guardianName,
      guardianPhone: student.guardianPhone, emergencyContact: student.emergencyContact,
      enrollmentStatus: student.enrollmentStatus,
    } : {
      year: 1, semester: 1, admissionYear: new Date().getFullYear(),
      enrollmentStatus: 'active', gender: 'male', bloodGroup: 'O+',
      section: 'A', batch: `${new Date().getFullYear()}-${new Date().getFullYear() + 4}`,
    }
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{student ? '✏️ Edit Student' : '➕ Add New Student'}</span>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit(onSave)}>
          <div className="modal-body">
            {/* Personal Info */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 16 }}>Personal Information</h4>
              <div className="form-grid form-grid-3">
                <div className="form-group">
                  <label className="form-label">Register Number <span>*</span></label>
                  <input className={`form-input ${errors.registerNumber ? 'error' : ''}`} {...register('registerNumber', { required: 'Required' })} placeholder="e.g. 20240001" />
                  {errors.registerNumber && <p className="form-error">{errors.registerNumber.message}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Full Name <span>*</span></label>
                  <input className={`form-input ${errors.name ? 'error' : ''}`} {...register('name', { required: 'Required' })} placeholder="Full name" />
                  {errors.name && <p className="form-error">{errors.name.message}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Gender <span>*</span></label>
                  <select className="form-input form-select" {...register('gender', { required: 'Required' })}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Birth <span>*</span></label>
                  <input className="form-input" type="date" {...register('dateOfBirth', { required: 'Required' })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Blood Group</label>
                  <select className="form-input form-select" {...register('bloodGroup')}>
                    {bloodGroups.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Enrollment Status</label>
                  <select className="form-input form-select" {...register('enrollmentStatus')}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="graduated">Graduated</option>
                    <option value="dropped">Dropped</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Address</label>
                  <input className="form-input" {...register('address')} placeholder="Full address" />
                </div>
              </div>
            </div>

            {/* Contact */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 16 }}>Contact Information</h4>
              <div className="form-grid form-grid-3">
                <div className="form-group">
                  <label className="form-label">Email <span>*</span></label>
                  <input className={`form-input ${errors.email ? 'error' : ''}`} type="email" {...register('email', { required: 'Required' })} placeholder="student@college.edu" />
                  {errors.email && <p className="form-error">{errors.email.message}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Phone <span>*</span></label>
                  <input className={`form-input ${errors.phone ? 'error' : ''}`} {...register('phone', { required: 'Required' })} placeholder="10-digit number" />
                  {errors.phone && <p className="form-error">{errors.phone.message}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Emergency Contact</label>
                  <input className="form-input" {...register('emergencyContact')} placeholder="Emergency phone" />
                </div>
              </div>
            </div>

            {/* Academic */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 16 }}>Academic Details</h4>
              <div className="form-grid form-grid-3">
                <div className="form-group">
                  <label className="form-label">Department <span>*</span></label>
                  <select className={`form-input form-select ${errors.departmentId ? 'error' : ''}`} {...register('departmentId', { required: 'Required' })}>
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  {errors.departmentId && <p className="form-error">{errors.departmentId.message}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Year <span>*</span></label>
                  <select className="form-input form-select" {...register('year', { valueAsNumber: true })}>
                    {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Semester <span>*</span></label>
                  <select className="form-input form-select" {...register('semester', { valueAsNumber: true })}>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Section <span>*</span></label>
                  <select className="form-input form-select" {...register('section')}>
                    {['A','B','C'].map(s => <option key={s} value={s}>Section {s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Batch</label>
                  <input className="form-input" {...register('batch')} placeholder="e.g. 2021-2025" />
                </div>
                <div className="form-group">
                  <label className="form-label">Admission Year</label>
                  <input className="form-input" type="number" {...register('admissionYear', { valueAsNumber: true })} />
                </div>
              </div>
            </div>

            {/* Guardian */}
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 16 }}>Guardian / Parent Details</h4>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Guardian Name</label>
                  <input className="form-input" {...register('guardianName')} placeholder="Parent or guardian name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Guardian Phone</label>
                  <input className="form-input" {...register('guardianPhone')} placeholder="Guardian phone number" />
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{student ? 'Update Student' : 'Add Student'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
