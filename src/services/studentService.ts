import { Student, StudentFormData, AttendanceSummary } from '../types';
import { seedStudents } from '../data/seedData';
import { attendanceService } from './attendanceService';

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
      s => s.departmentId === departmentId && s.year === year && s.section === section
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
    if (all.some(s => s.registerNumber === data.registerNumber)) {
      throw new Error('Register number already exists.');
    }
    if (all.some(s => s.email.toLowerCase() === data.email.toLowerCase())) {
      throw new Error('Email already exists.');
    }
    const newStudent: Student = {
      id: `stu_${Date.now()}`,
      attendancePercentage: 0,
      ...data,
      createdAt: new Date().toISOString().split('T')[0],
    };
    all.push(newStudent);
    localStorage.setItem(KEY, JSON.stringify(all));
    return newStudent;
  },

  update(id: string, data: Partial<StudentFormData>): Student {
    const all = this.getAll();
    const idx = all.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Student not found.');
    all[idx] = { ...all[idx], ...data };
    localStorage.setItem(KEY, JSON.stringify(all));
    return all[idx];
  },

  delete(id: string): void {
    const all = this.getAll().filter(s => s.id !== id);
    localStorage.setItem(KEY, JSON.stringify(all));
  },

  getAttendanceSummary(studentId: string, subjectId?: string): AttendanceSummary {
    const student = this.getById(studentId);
    if (!student) throw new Error('Student not found.');
    const records = attendanceService.getRecordsForStudent(studentId, subjectId);
    const totalDays = records.length;
    const presentDays = records.filter(r => r.status === 'present').length;
    const absentDays = totalDays - presentDays;
    return {
      studentId,
      studentName: student.name,
      registerNumber: student.registerNumber,
      departmentId: student.departmentId,
      subjectId,
      totalDays,
      presentDays,
      absentDays,
      percentage: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
    };
  },

  getLowAttendanceStudents(threshold = 75): (Student & { attendancePerc: number })[] {
    return this.getAll()
      .filter(s => s.enrollmentStatus === 'active')
      .map(s => {
        const summary = this.getAttendanceSummary(s.id);
        return { ...s, attendancePerc: summary.percentage };
      })
      .filter(s => s.attendancePerc > 0 && s.attendancePerc < threshold)
      .sort((a, b) => a.attendancePerc - b.attendancePerc);
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
