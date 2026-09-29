import { Router, Response } from 'express';
import { db } from '../database';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { Subject, SubjectFormData } from '../../src/types';

const router = Router();

router.get('/', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { departmentId, semester } = req.query;
  const database = db.get();
  let subjects = [...database.subjects];

  if (departmentId) subjects = subjects.filter(s => s.departmentId === departmentId);
  if (semester) subjects = subjects.filter(s => s.semester === Number(semester));

  const populated = subjects.map(s => {
    const dept = database.departments.find(d => d.id === s.departmentId);
    const faculty = database.faculty.find(f => f.id === s.facultyId);
    return { ...s, department: dept, faculty };
  });

  res.json({ success: true, data: populated });
});

router.get('/:id', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const database = db.get();
  const sub = database.subjects.find(s => s.id === id);
  if (!sub) {
    res.status(404).json({ success: false, message: 'Subject not found.' });
    return;
  }
  const dept = database.departments.find(d => d.id === sub.departmentId);
  const faculty = database.faculty.find(f => f.id === sub.facultyId);
  res.json({ success: true, data: { ...sub, department: dept, faculty } });
});

router.post('/', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const data: SubjectFormData = req.body;
  const database = db.get();

  if (!data.name || !data.code || !data.departmentId) {
    res.status(400).json({ success: false, message: 'Name, Code, and Department are required.' });
    return;
  }

  if (database.subjects.some(s => s.code.toLowerCase() === data.code.toLowerCase())) {
    res.status(400).json({ success: false, message: 'Subject code already exists.' });
    return;
  }

  const newSubject: Subject = {
    id: `sub_${Date.now()}`,
    ...data,
    createdAt: new Date().toISOString().split('T')[0],
  };

  database.subjects.push(newSubject);
  db.log('SUBJECT_CREATED', 'settings', `Added curriculum subject ${newSubject.name} (${newSubject.code})`, req.user, newSubject.id, req.ip);
  db.save(database);

  res.status(201).json({ success: true, data: newSubject });
});

router.put('/:id', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const data: Partial<SubjectFormData> = req.body;
  const database = db.get();
  const idx = database.subjects.findIndex(s => s.id === id);

  if (idx === -1) {
    res.status(404).json({ success: false, message: 'Subject not found.' });
    return;
  }

  database.subjects[idx] = { ...database.subjects[idx], ...data };
  db.log('SUBJECT_UPDATED', 'settings', `Updated subject ${database.subjects[idx].name}`, req.user, id, req.ip);
  db.save(database);

  res.json({ success: true, data: database.subjects[idx] });
});

router.delete('/:id', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const database = db.get();
  database.subjects = database.subjects.filter(s => s.id !== id);
  db.log('SUBJECT_DELETED', 'settings', `Deleted subject ${id}`, req.user, id, req.ip);
  db.save(database);
  res.json({ success: true, message: 'Subject removed.' });
});

export default router;
