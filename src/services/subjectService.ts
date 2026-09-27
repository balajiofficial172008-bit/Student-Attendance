import { Subject, SubjectFormData } from '../types';
import { seedSubjects } from '../data/seedData';

const KEY = 'sams_subjects';

function init(): void {
  if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(seedSubjects));
}

export const subjectService = {
  getAll(): Subject[] {
    init();
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  },

  getById(id: string): Subject | undefined {
    return this.getAll().find(s => s.id === id);
  },

  getByDepartment(departmentId: string): Subject[] {
    return this.getAll().filter(s => s.departmentId === departmentId);
  },

  getBySemester(departmentId: string, semester: number): Subject[] {
    return this.getAll().filter(s => s.departmentId === departmentId && s.semester === semester);
  },

  create(data: SubjectFormData): Subject {
    const all = this.getAll();
    if (all.some(s => s.code.toLowerCase() === data.code.toLowerCase())) {
      throw new Error('Subject code already exists.');
    }
    const newSubject: Subject = {
      id: `sub_${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString().split('T')[0],
    };
    all.push(newSubject);
    localStorage.setItem(KEY, JSON.stringify(all));
    return newSubject;
  },

  update(id: string, data: Partial<SubjectFormData>): Subject {
    const all = this.getAll();
    const idx = all.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Subject not found.');
    all[idx] = { ...all[idx], ...data };
    localStorage.setItem(KEY, JSON.stringify(all));
    return all[idx];
  },

  delete(id: string): void {
    const all = this.getAll().filter(s => s.id !== id);
    localStorage.setItem(KEY, JSON.stringify(all));
  },
};
