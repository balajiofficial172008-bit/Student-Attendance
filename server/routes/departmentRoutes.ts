import { Router, Response } from 'express';
import { db } from '../database';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { Department, DepartmentFormData } from '../../src/types';

const router = Router();

router.get('/', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const database = db.get();
  res.json({ success: true, data: database.departments });
});

router.get('/:id', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const database = db.get();
  const dept = database.departments.find(d => d.id === id);
  if (!dept) {
    res.status(404).json({ success: false, message: 'Department not found.' });
    return;
  }
  res.json({ success: true, data: dept });
});

router.post('/', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const data: DepartmentFormData = req.body;
  const database = db.get();

  if (!data.name || !data.code) {
    res.status(400).json({ success: false, message: 'Name and Code are required.' });
    return;
  }

  if (database.departments.some(d => d.code.toLowerCase() === data.code.toLowerCase())) {
    res.status(400).json({ success: false, message: 'Department code already exists.' });
    return;
  }

  const newDept: Department = {
    id: `dept_${Date.now()}`,
    ...data,
    createdAt: new Date().toISOString().split('T')[0],
  };

  database.departments.push(newDept);
  db.log('DEPARTMENT_CREATED', 'settings', `Created department ${newDept.name} (${newDept.code})`, req.user, newDept.id, req.ip);
  db.save(database);

  res.status(201).json({ success: true, data: newDept });
});

router.put('/:id', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const data: Partial<DepartmentFormData> = req.body;
  const database = db.get();
  const idx = database.departments.findIndex(d => d.id === id);

  if (idx === -1) {
    res.status(404).json({ success: false, message: 'Department not found.' });
    return;
  }

  database.departments[idx] = { ...database.departments[idx], ...data };
  db.log('DEPARTMENT_UPDATED', 'settings', `Updated department ${database.departments[idx].name}`, req.user, id, req.ip);
  db.save(database);

  res.json({ success: true, data: database.departments[idx] });
});

router.delete('/:id', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const database = db.get();
  database.departments = database.departments.filter(d => d.id !== id);
  db.log('DEPARTMENT_DELETED', 'settings', `Deleted department ${id}`, req.user, id, req.ip);
  db.save(database);
  res.json({ success: true, message: 'Department deleted.' });
});

export default router;
