import { Faculty, FacultyFormData } from '../types';
import { seedFaculty } from '../data/seedData';

const KEY = 'sams_faculty';

function init(): void {
  if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(seedFaculty));
}

export const facultyService = {
  getAll(): Faculty[] {
    init();
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  },

  getById(id: string): Faculty | undefined {
    return this.getAll().find(f => f.id === id);
  },

  getByDepartment(departmentId: string): Faculty[] {
    return this.getAll().filter(f => f.departmentId === departmentId);
  },

  create(data: FacultyFormData): Faculty {
    const all = this.getAll();
    if (all.some(f => f.email.toLowerCase() === data.email.toLowerCase())) {
      throw new Error('Faculty with this email already exists.');
    }
    if (all.some(f => f.facultyId === data.facultyId)) {
      throw new Error('Faculty ID already exists.');
    }
    const newFaculty: Faculty = {
      id: `fac_${Date.now()}`,
      assignedSubjects: [],
      assignedClasses: [],
      ...data,
      createdAt: new Date().toISOString().split('T')[0],
    };
    all.push(newFaculty);
    localStorage.setItem(KEY, JSON.stringify(all));
    return newFaculty;
  },

  update(id: string, data: Partial<FacultyFormData>): Faculty {
    const all = this.getAll();
    const idx = all.findIndex(f => f.id === id);
    if (idx === -1) throw new Error('Faculty not found.');
    all[idx] = { ...all[idx], ...data };
    localStorage.setItem(KEY, JSON.stringify(all));
    return all[idx];
  },

  delete(id: string): void {
    const all = this.getAll().filter(f => f.id !== id);
    localStorage.setItem(KEY, JSON.stringify(all));
  },
};
