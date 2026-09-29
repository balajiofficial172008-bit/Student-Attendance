import { Student, StudentFormData, AttendanceSummary, EligibilityPrediction } from '../types';
import { seedStudents } from '../data/seedData';
import { attendanceService } from './attendanceService';
import { apiRequest, getBackendStatus } from './api/apiClient';
import { mockBackendEngine } from './api/mockBackendEngine';

const KEY = 'sams_students';

function init(): void {
  if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(seedStudents));
}

export const studentService = {
  getAll(): Student[] {
    init();
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  },

  getById(id: string): Student | undefined {
    return this.getAll().find(s => s.id === id);
  },

  getByDepartment(departmentId: string): Student[] {
    return this.getAll().filter(s => s.departmentId === departmentId);
  },

  getByDeptYearSection(departmentId: string, year: number, section: string): Student[] {
    return this.getAll().filter(
      s => s.departmentId === departmentId && s.year === Number(year) && s.section === section
    );
  },

  search(query: string): Student[] {
    const q = query.toLowerCase();
    return this.getAll().filter(
      s => s.name.toLowerCase().includes(q) ||
           s.registerNumber.toLowerCase().includes(q) ||
           s.email.toLowerCase().includes(q)
    );
  },

  create(data: StudentFormData): Student {
    const all = this.getAll();
    if (all.some(s => s.registerNumber.toLowerCase() === data.registerNumber.toLowerCase())) {
      throw new Error('Register number already exists.');
    }
    if (all.some(s => s.email.toLowerCase() === data.email.toLowerCase())) {
      throw new Error('Email already exists.');
    }
    const newStudent: Student = {
      id: `stu_${Date.now()}`,
      attendancePercentage: 100,
      ...data,
      year: Number(data.year),
      semester: Number(data.semester),
      admissionYear: Number(data.admissionYear),
      createdAt: new Date().toISOString().split('T')[0],
    };
    all.push(newStudent);
    localStorage.setItem(KEY, JSON.stringify(all));

    const backend = getBackendStatus();
    if (backend.connected) {
      apiRequest('/students', {
        method: 'POST',
        body: JSON.stringify(data),
      }).catch(() => {});
    }

    mockBackendEngine.log('STUDENT_ENROLLED', 'student', `Enrolled student ${newStudent.name} (${newStudent.registerNumber})`, undefined, newStudent.id);

    return newStudent;
  },

  update(id: string, data: Partial<StudentFormData>): Student {
    const all = this.getAll();
    const idx = all.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Student not found.');
    all[idx] = { ...all[idx], ...data };
    localStorage.setItem(KEY, JSON.stringify(all));

    const backend = getBackendStatus();
    if (backend.connected) {
      apiRequest(`/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }).catch(() => {});
    }

    mockBackendEngine.log('STUDENT_UPDATED', 'student', `Updated student ${all[idx].name}`, undefined, id);

    return all[idx];
  },

  delete(id: string): void {
    const all = this.getAll().filter(s => s.id !== id);
    localStorage.setItem(KEY, JSON.stringify(all));

    const backend = getBackendStatus();
    if (backend.connected) {
      apiRequest(`/students/${id}`, { method: 'DELETE' }).catch(() => {});
    }

    mockBackendEngine.log('STUDENT_REMOVED', 'student', `Deleted student id ${id}`, undefined, id);
  },

  getAttendanceSummary(studentId: string, subjectId?: string): AttendanceSummary {
    const student = this.getById(studentId);
    if (!student) throw new Error('Student not found.');
    const records = attendanceService.getRecordsForStudent(studentId, subjectId);
    const totalDays = records.length;

    const presentDays = records.filter(r => r.status === 'present').length;
    const onDutyDays = records.filter(r => r.status === 'on_duty').length;
    const lateDays = records.filter(r => r.status === 'late').length;
    const medicalDays = records.filter(r => r.status === 'medical_leave').length;
    const absentDays = records.filter(r => r.status === 'absent').length;

    const effective = presentDays + onDutyDays + medicalDays + (lateDays * 0.5);
    const percentage = totalDays > 0 ? Math.round((effective / totalDays) * 100) : 0;

    return {
      studentId,
      studentName: student.name,
      registerNumber: student.registerNumber,
      departmentId: student.departmentId,
      subjectId,
      totalDays,
      presentDays: presentDays + onDutyDays + medicalDays,
      absentDays,
      percentage,
    };
  },

  getLowAttendanceStudents(threshold = 75): (Student & { attendancePerc: number; riskLevel: 'critical' | 'warning' })[] {
    return this.getAll()
      .filter(s => s.enrollmentStatus === 'active')
      .map(s => {
        const summary = this.getAttendanceSummary(s.id);
        const perc = summary.percentage;
        return {
          ...s,
          attendancePerc: perc,
          riskLevel: (perc < 60 ? 'critical' : 'warning') as 'critical' | 'warning',
        };
      })
      .filter(s => s.attendancePerc < threshold)
      .sort((a, b) => a.attendancePerc - b.attendancePerc);
  },

  async predictEligibility(studentId: string, targetPerc = 75): Promise<EligibilityPrediction> {
    return attendanceService.predictEligibility(studentId, targetPerc);
  },

  async bulkImport(students: any[]): Promise<{ importedCount: number; skippedCount: number; skippedDetails: string[] }> {
    const backend = getBackendStatus();
    if (backend.connected) {
      try {
        const res = await apiRequest('/students/bulk-import', {
          method: 'POST',
          body: JSON.stringify({ students }),
        });
        // Refresh local cache
        const allRes = await apiRequest('/students');
        localStorage.setItem(KEY, JSON.stringify(allRes.data));
        return {
          importedCount: res.data.importedCount,
          skippedCount: res.data.skippedCount,
          skippedDetails: res.data.skippedDetails,
        };
      } catch (err) {
        console.warn('Backend bulk import failed, executing locally:', err);
      }
    }

    const all = this.getAll();
    const existingRegNos = new Set(all.map(s => s.registerNumber.toLowerCase()));
    let importedCount = 0;
    const skippedDetails: string[] = [];

    students.forEach((item, idx) => {
      if (!item.name || !item.registerNumber || !item.departmentId) {
        skippedDetails.push(`Row ${idx + 1}: Missing mandatory fields`);
        return;
      }
      if (existingRegNos.has(item.registerNumber.toLowerCase())) {
        skippedDetails.push(`Row ${idx + 1}: Register Number ${item.registerNumber} duplicate`);
        return;
      }

      const newStudent: Student = {
        id: `stu_${Date.now()}_${idx}`,
        name: item.name,
        registerNumber: item.registerNumber,
        email: item.email || `${item.registerNumber.toLowerCase()}@student.college.edu`,
        phone: item.phone || '9876543210',
        gender: item.gender || 'male',
        dateOfBirth: item.dateOfBirth || '2004-01-01',
        address: item.address || 'College Campus',
        departmentId: item.departmentId,
        year: Number(item.year) || 1,
        semester: Number(item.semester) || 1,
        section: item.section || 'A',
        batch: item.batch || '2024-2028',
        admissionYear: Number(item.admissionYear) || 2024,
        bloodGroup: item.bloodGroup || 'O+',
        guardianName: item.guardianName || 'Parent',
        guardianPhone: item.guardianPhone || '9876543210',
        emergencyContact: item.emergencyContact || '9876543210',
        enrollmentStatus: 'active',
        attendancePercentage: 100,
        createdAt: new Date().toISOString().split('T')[0],
      };
      all.push(newStudent);
      existingRegNos.add(newStudent.registerNumber.toLowerCase());
      importedCount++;
    });

    localStorage.setItem(KEY, JSON.stringify(all));
    return {
      importedCount,
      skippedCount: skippedDetails.length,
      skippedDetails,
    };
  },

  updateAttendancePercentages(): void {
    const all = this.getAll();
    const updated = all.map(s => {
      const summary = this.getAttendanceSummary(s.id);
      return { ...s, attendancePercentage: summary.percentage };
    });
    localStorage.setItem(KEY, JSON.stringify(updated));
  },
};
