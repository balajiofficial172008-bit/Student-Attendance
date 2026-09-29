import { Router, Response } from 'express';
import { db } from '../database';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { LeaveRequest } from '../../src/types';

const router = Router();

// GET /api/leaves
router.get('/', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { studentId, departmentId, status } = req.query;
  const database = db.get();
  let leaves = [...database.leaveRequests];

  if (studentId) leaves = leaves.filter(l => l.studentId === studentId);
  if (departmentId) leaves = leaves.filter(l => l.departmentId === departmentId);
  if (status) leaves = leaves.filter(l => l.status === status);

  // Newest first
  leaves.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  res.json({
    success: true,
    total: leaves.length,
    data: leaves,
  });
});

// POST /api/leaves
router.post('/', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { studentId, type, startDate, endDate, reason, documentUrl } = req.body;

  if (!studentId || !type || !startDate || !endDate || !reason) {
    res.status(400).json({ success: false, message: 'Missing mandatory leave fields.' });
    return;
  }

  const database = db.get();
  const student = database.students.find(s => s.id === studentId);
  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found.' });
    return;
  }

  const newLeave: LeaveRequest = {
    id: `leave_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    studentId,
    studentName: student.name,
    registerNumber: student.registerNumber,
    departmentId: student.departmentId,
    type,
    startDate,
    endDate,
    reason,
    documentUrl,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  database.leaveRequests.unshift(newLeave);

  db.log(
    'LEAVE_APPLICATION_SUBMITTED',
    'leave',
    `Applied for ${type.replace('_', ' ').toUpperCase()} from ${startDate} to ${endDate} for ${student.name}`,
    req.user,
    newLeave.id,
    req.ip
  );

  db.save(database);

  res.status(201).json({
    success: true,
    message: 'Leave / On-Duty application submitted successfully for review.',
    data: newLeave,
  });
});

// PATCH /api/leaves/:id/status
// HOD / Admin approves or rejects. When approved, updates corresponding attendance records automatically!
router.patch('/:id/status', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const { status, remarks } = req.body;

  if (!status || (status !== 'approved' && status !== 'rejected')) {
    res.status(400).json({ success: false, message: 'Status must be approved or rejected.' });
    return;
  }

  const database = db.get();
  const leaveIdx = database.leaveRequests.findIndex(l => l.id === id);
  if (leaveIdx === -1) {
    res.status(404).json({ success: false, message: 'Leave request not found.' });
    return;
  }

  const leave = database.leaveRequests[leaveIdx];
  leave.status = status;
  leave.approvedBy = req.user?.id || 'admin';
  leave.approvedByName = req.user?.name || 'Administrator';
  leave.approvedAt = new Date().toISOString();

  // If approved: AUTOMATIC ATTENDANCE UPDATE ENGINE!
  // Find all attendance sessions between leave.startDate and leave.endDate
  if (status === 'approved') {
    const targetStatus = leave.type === 'on_duty' ? 'on_duty' : 'medical_leave';
    let updatedRecordsCount = 0;

    database.sessions.forEach(sess => {
      if (sess.date >= leave.startDate && sess.date <= leave.endDate) {
        // Check if student has a record in this session
        const rec = database.records.find(r => r.sessionId === sess.id && r.studentId === leave.studentId);
        if (rec) {
          rec.status = targetStatus;
          rec.remarks = `Auto-approved via ${leave.type} #${leave.id}: ${remarks || leave.reason}`;
          updatedRecordsCount++;
        }
      }
    });

    // Recalculate student attendance percentage
    const studentIdx = database.students.findIndex(s => s.id === leave.studentId);
    if (studentIdx !== -1) {
      const studentRecs = database.records.filter(r => r.studentId === leave.studentId);
      const total = studentRecs.length;
      const effective = studentRecs.filter(r => r.status === 'present' || r.status === 'on_duty' || r.status === 'medical_leave').length +
        (studentRecs.filter(r => r.status === 'late').length * 0.5);
      database.students[studentIdx].attendancePercentage = total > 0 ? Math.round((effective / total) * 100) : 0;
    }

    db.log(
      'LEAVE_APPLICATION_APPROVED',
      'leave',
      `Approved ${leave.type} for ${leave.studentName}. Automatically updated ${updatedRecordsCount} attendance records.`,
      req.user,
      leave.id,
      req.ip
    );
  } else {
    db.log(
      'LEAVE_APPLICATION_REJECTED',
      'leave',
      `Rejected ${leave.type} for ${leave.studentName}. Reason: ${remarks || 'Unspecified'}`,
      req.user,
      leave.id,
      req.ip
    );
  }

  db.save(database);

  res.json({
    success: true,
    message: `Leave request has been ${status}.`,
    data: leave,
  });
});

export default router;
