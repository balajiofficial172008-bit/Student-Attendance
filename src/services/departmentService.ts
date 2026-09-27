import { Department, DepartmentFormData } from '../types';
import { seedDepartments } from '../data/seedData';

const KEY = 'sams_departments';

function init(): void {
  if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(seedDepartments));
}

export const departmentService = {
  getAll(): Department[] {
    init();
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  },

  getById(id: string): Department | undefined {
    return this.getAll().find(d => d.id === id);
  },

  create(data: DepartmentFormData): Department {
    const departments = this.getAll();
    if (departments.some(d => d.code.toLowerCase() === data.code.toLowerCase())) {
      throw new Error('Department code already exists.');
    }
    const newDept: Department = {
      id: `dept_${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString().split('T')[0],
    };
    departments.push(newDept);
    localStorage.setItem(KEY, JSON.stringify(departments));
    return newDept;
  },

  update(id: string, data: Partial<DepartmentFormData>): Department {
    const departments = this.getAll();
    const idx = departments.findIndex(d => d.id === id);
    if (idx === -1) throw new Error('Department not found.');
    departments[idx] = { ...departments[idx], ...data };
    localStorage.setItem(KEY, JSON.stringify(departments));
    return departments[idx];
  },

  delete(id: string): void {
    const departments = this.getAll().filter(d => d.id !== id);
    localStorage.setItem(KEY, JSON.stringify(departments));
  },
};
