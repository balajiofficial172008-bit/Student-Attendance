import fs from 'fs';
import path from 'path';
import {
  Department, Faculty, Subject, Student,
  AttendanceSession, AttendanceRecord, Notification, User, Settings,
  AuditLog, LeaveRequest, EligibilityPrediction
} from '../src/types';
import {
  seedDepartments, seedFaculty, seedSubjects, seedStudents,
  seedSessions, seedRecords, seedUsers, seedPasswords,
  seedNotifications, seedSettings
} from '../src/data/seedData';

export interface DatabaseSchema {
  departments: Department[];
  faculty: Faculty[];
  subjects: Subject[];
  students: Student[];
  sessions: AttendanceSession[];
  records: AttendanceRecord[];
  users: User[];
  passwords: Record<string, string>;
  notifications: Notification[];
  settings: Settings;
  auditLogs: AuditLog[];
  leaveRequests: LeaveRequest[];
}

const DB_DIR = path.resolve(process.cwd(), 'server', 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Ensure directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const initialAuditLogs: AuditLog[] = [
  {
    id: 'log_init_1',
    action: 'SYSTEM_INITIALIZED',
    entityType: 'system',
    details: 'System database bootstrapped with production seed data and default configurations.',
    userId: 'u1',
    userName: 'Dr. Admin Singh',
    userRole: 'admin',
    timestamp: new Date().toISOString(),
    ip: '127.0.0.1',
  },
  {
    id: 'log_init_2',
    action: 'ATTENDANCE_SESSION_RECORDED',
    entityType: 'attendance',
    entityId: 'sess1',
    details: 'Automated attendance audit established for CS301 (Data Structures).',
    userId: 'u2',
    userName: 'Dr. Anil Verma',
    userRole: 'faculty',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    ip: '192.168.1.42',
  },
];

const initialLeaveRequests: LeaveRequest[] = [
  {
    id: 'leave_1',
    studentId: 'stu2',
    studentName: 'Priya Patel',
    registerNumber: '20230002',
    departmentId: 'd1',
    type: 'on_duty',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: 'Representing college at National Level Hackathon (Smart India Hackathon).',
    status: 'approved',
    approvedBy: 'u1',
    approvedByName: 'Dr. Admin Singh',
    approvedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'leave_2',
    studentId: 'stu5',
    studentName: 'Vikram Nair',
    registerNumber: '20230005',
    departmentId: 'd1',
    type: 'medical_leave',
    startDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: 'Viral fever - doctor prescription verified by department medical counselor.',
    status: 'pending',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

function initDb(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    const data: DatabaseSchema = {
      departments: seedDepartments,
      faculty: seedFaculty,
      subjects: seedSubjects,
      students: seedStudents,
      sessions: seedSessions,
      records: seedRecords,
      users: seedUsers,
      passwords: seedPasswords,
      notifications: seedNotifications,
      settings: seedSettings,
      auditLogs: initialAuditLogs,
      leaveRequests: initialLeaveRequests,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return data;
  }

  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    // Ensure all keys exist
    if (!parsed.auditLogs) parsed.auditLogs = initialAuditLogs;
    if (!parsed.leaveRequests) parsed.leaveRequests = initialLeaveRequests;
    return parsed;
  } catch (err) {
    console.error('Error reading database file, recreating:', err);
    const data: DatabaseSchema = {
      departments: seedDepartments,
      faculty: seedFaculty,
      subjects: seedSubjects,
      students: seedStudents,
      sessions: seedSessions,
      records: seedRecords,
      users: seedUsers,
      passwords: seedPasswords,
      notifications: seedNotifications,
      settings: seedSettings,
      auditLogs: initialAuditLogs,
      leaveRequests: initialLeaveRequests,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return data;
  }
}

export const db = {
  get(): DatabaseSchema {
    return initDb();
  },

  save(data: DatabaseSchema): void {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  },

  log(
    action: string,
    entityType: AuditLog['entityType'],
    details: string,
    user?: { id: string; name: string; role: string },
    entityId?: string,
    ip = '127.0.0.1'
  ): AuditLog {
    const data = this.get();
    const logItem: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      action,
      entityType,
      entityId,
      details,
      userId: user?.id || 'system',
      userName: user?.name || 'System Worker',
      userRole: user?.role || 'system',
      timestamp: new Date().toISOString(),
      ip,
    };
    data.auditLogs.unshift(logItem);
    if (data.auditLogs.length > 500) data.auditLogs = data.auditLogs.slice(0, 500);
    this.save(data);
    return logItem;
  },

  // Calculate detailed student attendance metrics
  calculateStudentMetrics(studentId: string, subjectId?: string) {
    const data = this.get();
    const student = data.students.find(s => s.id === studentId);
    if (!student) return null;

    let relevantSessions = data.sessions;
    if (subjectId) {
      relevantSessions = relevantSessions.filter(s => s.subjectId === subjectId);
    }
    const sessionIds = new Set(relevantSessions.map(s => s.id));

    const records = data.records.filter(r => r.studentId === studentId && sessionIds.has(r.sessionId));
    const totalDays = records.length;

    // Advanced Attendance Logic:
    // Present = 1.0
    // On-Duty (OD) = 1.0 (approved academic/college duty counts as present)
    // Late = 0.5 (or full present depending on policy)
    // Medical Leave (ML) = exempt or present
    const presentRecords = records.filter(r => r.status === 'present').length;
    const onDutyRecords = records.filter(r => r.status === 'on_duty').length;
    const lateRecords = records.filter(r => r.status === 'late').length;
    const medicalRecords = records.filter(r => r.status === 'medical_leave').length;
    const absentRecords = records.filter(r => r.status === 'absent').length;

    // Effective present days
    const effectivePresent = presentRecords + onDutyRecords + (lateRecords * 0.5) + medicalRecords;
    const percentage = totalDays > 0 ? Math.round((effectivePresent / totalDays) * 100) : 0;

    return {
      studentId,
      studentName: student.name,
      registerNumber: student.registerNumber,
      departmentId: student.departmentId,
      subjectId,
      totalDays,
      presentDays: presentRecords,
      onDutyDays: onDutyRecords,
      lateDays: lateRecords,
      medicalDays: medicalRecords,
      absentDays: absentRecords,
      effectivePresent,
      percentage,
      isLowAttendance: percentage < (data.settings.attendanceThreshold || 75),
    };
  },

  // Algorithmic Detention Predictor & Advice Engine
  predictEligibility(studentId: string, targetPerc = 75): EligibilityPrediction {
    const data = this.get();
    const student = data.students.find(s => s.id === studentId);
    const dept = data.departments.find(d => d.id === student?.departmentId);
    const metrics = this.calculateStudentMetrics(studentId);

    const totalConducted = metrics?.totalDays || 0;
    const totalAttended = metrics?.effectivePresent || 0;
    const currentPerc = metrics?.percentage || 0;

    let status: 'safe' | 'warning' | 'critical' = 'safe';
    if (currentPerc < 65) status = 'critical';
    else if (currentPerc < targetPerc) status = 'warning';

    // Formula calculation:
    // If currentPerc < targetPerc:
    // We need: (totalAttended + X) / (totalConducted + X) >= targetPerc / 100
    // => 100 * totalAttended + 100 * X >= targetPerc * totalConducted + targetPerc * X
    // => X * (100 - targetPerc) >= targetPerc * totalConducted - 100 * totalAttended
    // => X = ceil((targetPerc * totalConducted - 100 * totalAttended) / (100 - targetPerc))
    let classesNeededToReachTarget = 0;
    let classesCanSafelyMiss = 0;

    if (currentPerc < targetPerc) {
      const numerator = (targetPerc * totalConducted) - (100 * totalAttended);
      const denominator = 100 - targetPerc;
      classesNeededToReachTarget = Math.max(0, Math.ceil(numerator / denominator));
    } else {
      // If currentPerc >= targetPerc:
      // We can miss Y classes:
      // totalAttended / (totalConducted + Y) >= targetPerc / 100
      // => 100 * totalAttended >= targetPerc * (totalConducted + Y)
      // => targetPerc * Y <= 100 * totalAttended - targetPerc * totalConducted
      // => Y = floor((100 * totalAttended - targetPerc * totalConducted) / targetPerc)
      const numerator = (100 * totalAttended) - (targetPerc * totalConducted);
      classesCanSafelyMiss = Math.max(0, Math.floor(numerator / targetPerc));
    }

    let advice = '';
    if (status === 'critical') {
      advice = `CRITICAL DETENTION RISK (${currentPerc}%). Must attend the next ${classesNeededToReachTarget} consecutive classes without missing any to regain exam eligibility.`;
    } else if (status === 'warning') {
      advice = `WARNING ZONE (${currentPerc}%). Below mandatory ${targetPerc}% threshold. Attend ${classesNeededToReachTarget} more consecutive lectures to reach safe criteria.`;
    } else {
      advice = `GOOD STANDING (${currentPerc}%). You satisfy university criteria. You can afford to miss up to ${classesCanSafelyMiss} classes while maintaining >= ${targetPerc}%.`;
    }

    return {
      studentId,
      studentName: student?.name || 'Unknown',
      registerNumber: student?.registerNumber || '',
      departmentName: dept?.name || '',
      currentPercentage: currentPerc,
      targetPercentage: targetPerc,
      totalConducted,
      totalAttended: Math.round(totalAttended),
      status,
      classesNeededToReachTarget,
      classesCanSafelyMiss,
      advice,
    };
  },
};
