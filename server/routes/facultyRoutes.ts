import { Router, Response } from 'express';
import { db } from '../database';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { Faculty, FacultyFormData } from '../../src/types';

const router = Router();

router.get('/', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { departmentId } = req.query;
  const database = db.get();
  let faculty = [...database.faculty];

  if (departmentId) faculty = faculty.filter(f => f.departmentId === departmentId);

  const populated = faculty.map(f => {
    const dept = database.departments.find(d => d.id === f.departmentId);
    return { ...f, department: dept };
  });

  res.json({ success: true, data: populated });
});

router.get('/:id', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const database = db.get();
  const f = database.faculty.find(fac => fac.id === id);
  if (!f) {
    res.status(404).json({ success: false, message: 'Faculty not found.' });
    return;
  }
  const dept = database.departments.find(d => d.id === f.departmentId);
  res.json({ success: true, data: { ...f, department: dept } });
});

router.post('/', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const data: FacultyFormData = req.body;
  const database = db.get();

  if (!data.name || !data.facultyId || !data.email) {
    res.status(400).json({ success: false, message: 'Name, Faculty ID, and Email are required.' });
    return;
  }

  if (database.faculty.some(f => f.email.toLowerCase() === data.email.toLowerCase())) {
    res.status(400).json({ success: false, message: 'Faculty email already registered.' });
    return;
  }

  if (database.faculty.some(f => f.facultyId.toLowerCase() === data.facultyId.toLowerCase())) {
    res.status(400).json({ success: false, message: 'Faculty ID already in use.' });
    return;
  }

  const newFaculty: Faculty = {
    id: `fac_${Date.now()}`,
    assignedSubjects: [],
    assignedClasses: [],
    ...data,
    createdAt: new Date().toISOString().split('T')[0],
  };

  database.faculty.push(newFaculty);
  db.log('FACULTY_APPOINTED', 'system', `Appointed faculty ${newFaculty.name} (${newFaculty.facultyId})`, req.user, newFaculty.id, req.ip);
  db.save(database);

  res.status(201).json({ success: true, data: newFaculty });
});

router.put('/:id', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const data: Partial<FacultyFormData> = req.body;
  const database = db.get();
  const idx = database.faculty.findIndex(f => f.id === id);

  if (idx === -1) {
    res.status(404).json({ success: false, message: 'Faculty not found.' });
    return;
  }

  database.faculty[idx] = { ...database.faculty[idx], ...data };
  db.log('FACULTY_UPDATED', 'system', `Updated faculty profile for ${database.faculty[idx].name}`, req.user, id, req.ip);
  db.save(database);

  res.json({ success: true, data: database.faculty[idx] });
});

router.delete('/:id', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const database = db.get();
  database.faculty = database.faculty.filter(f => f.id !== id);
  db.log('FACULTY_REMOVED', 'system', `Removed faculty member ${id}`, req.user, id, req.ip);
  db.save(database);
  res.json({ success: true, message: 'Faculty member removed.' });
});

export default router;
