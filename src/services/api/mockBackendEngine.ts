import {
  Department, Faculty, Subject, Student,
  AttendanceSession, AttendanceRecord, Notification, User, Settings,
  AuditLog, LeaveRequest, EligibilityPrediction, AttendanceStatus
} from '../../types';
import {
  seedDepartments, seedFaculty, seedSubjects, seedStudents,
  seedSessions, seedRecords, seedUsers, seedPasswords,
  seedNotifications, seedSettings
} from '../../data/seedData';

const K_DEPTS = 'sams_departments';
const K_FACULTY = 'sams_faculty';
const K_SUBJECTS = 'sams_subjects';
const K_STUDENTS = 'sams_students';
const K_SESSIONS = 'sams_sessions';
const K_RECORDS = 'sams_records';
const K_USERS = 'sams_users';
const K_PASSWORDS = 'sams_passwords';
const K_NOTIFS = 'sams_notifications';
const K_SETTINGS = 'sams_settings';
const K_AUDIT = 'sams_audit_logs';
const K_LEAVES = 'sams_leaves';

function initStore(): void {
  if (!localStorage.getItem(K_DEPTS)) localStorage.setItem(K_DEPTS, JSON.stringify(seedDepartments));
  if (!localStorage.getItem(K_FACULTY)) localStorage.setItem(K_FACULTY, JSON.stringify(seedFaculty));
  if (!localStorage.getItem(K_SUBJECTS)) localStorage.setItem(K_SUBJECTS, JSON.stringify(seedSubjects));
  if (!localStorage.getItem(K_STUDENTS)) localStorage.setItem(K_STUDENTS, JSON.stringify(seedStudents));
  if (!localStorage.getItem(K_SESSIONS)) localStorage.setItem(K_SESSIONS, JSON.stringify(seedSessions));
  if (!localStorage.getItem(K_RECORDS)) localStorage.setItem(K_RECORDS, JSON.stringify(seedRecords));
  if (!localStorage.getItem(K_USERS)) localStorage.setItem(K_USERS, JSON.stringify(seedUsers));
  if (!localStorage.getItem(K_PASSWORDS)) localStorage.setItem(K_PASSWORDS, JSON.stringify(seedPasswords));
  if (!localStorage.getItem(K_NOTIFS)) localStorage.setItem(K_NOTIFS, JSON.stringify(seedNotifications));
  if (!localStorage.getItem(K_SETTINGS)) localStorage.setItem(K_SETTINGS, JSON.stringify(seedSettings));

  if (!localStorage.getItem(K_AUDIT)) {
    const initialLogs: AuditLog[] = [
      {
        id: 'log_1',
        action: 'SYSTEM_INITIALIZED',
        entityType: 'system',
        details: 'Resilient in-browser backend engine bootstrapped with offline cache.',
        userId: 'u1',
        userName: 'Dr. Admin Singh',
        userRole: 'admin',
        timestamp: new Date().toISOString(),
        ip: '127.0.0.1 (Client Cache)',
      },
    ];
    localStorage.setItem(K_AUDIT, JSON.stringify(initialLogs));
  }

  if (!localStorage.getItem(K_LEAVES)) {
    const initialLeaves: LeaveRequest[] = [
      {
        id: 'leave_init_1',
        studentId: 'stu2',
        studentName: 'Priya Patel',
        registerNumber: '20230002',
        departmentId: 'd1',
        type: 'on_duty',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: 'National Symposium paper presentation at Anna University.',
        status: 'approved',
        approvedBy: 'u1',
        approvedByName: 'Dr. Admin Singh',
        approvedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'leave_init_2',
        studentId: 'stu5',
        studentName: 'Vikram Nair',
        registerNumber: '20230005',
        departmentId: 'd1',
        type: 'medical_leave',
        startDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: 'Viral fever - doctor prescription verified.',
        status: 'pending',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    localStorage.setItem(K_LEAVES, JSON.stringify(initialLeaves));
  }
}

function getItem<T>(key: string, def: T): T {
  initStore();
  const val = localStorage.getItem(key);
  try {
    return val ? JSON.parse(val) : def;
  } catch {
    return def;
  }
}

function setItem<T>(key: string, val: T): void {
  localStorage.setItem(key, JSON.stringify(val));
}

// Simulated network latency
const sleep = (ms = 80) => new Promise(resolve => setTimeout(resolve, ms));

export const mockBackendEngine = {
  async log(action: string, entityType: AuditLog['entityType'], details: string, user?: { id: string; name: string; role: string }, entityId?: string) {
    const logs = getItem<AuditLog[]>(K_AUDIT, []);
    const logItem: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      action,
      entityType,
      entityId,
      details,
      userId: user?.id || 'u1',
      userName: user?.name || 'Administrator',
      userRole: user?.role || 'admin',
      timestamp: new Date().toISOString(),
      ip: '127.0.0.1 (Client Cache)',
    };
    logs.unshift(logItem);
    setItem(K_AUDIT, logs.slice(0, 300));
    return logItem;
  },

  async getAuditLogs(entityType?: string, search?: string): Promise<AuditLog[]> {
    await sleep(60);
    let logs = getItem<AuditLog[]>(K_AUDIT, []);
    if (entityType) logs = logs.filter(l => l.entityType === entityType);
    if (search) {
      const q = search.toLowerCase();
      logs = logs.filter(l => l.action.toLowerCase().includes(q) || l.details.toLowerCase().includes(q) || l.userName.toLowerCase().includes(q));
    }
    return logs;
  },

  async calculateStudentMetrics(studentId: string, subjectId?: string) {
    const students = getItem<Student[]>(K_STUDENTS, []);
    const sessions = getItem<AttendanceSession[]>(K_SESSIONS, []);
    const records = getItem<AttendanceRecord[]>(K_RECORDS, []);
    const settings = getItem<Settings>(K_SETTINGS, seedSettings);

    const student = students.find(s => s.id === studentId);
    if (!student) return null;

    let relevantSessions = sessions;
    if (subjectId) relevantSessions = relevantSessions.filter(s => s.subjectId === subjectId);
    const sessionIds = new Set(relevantSessions.map(s => s.id));

    const studentRecs = records.filter(r => r.studentId === studentId && sessionIds.has(r.sessionId));
    const totalDays = studentRecs.length;

    const presentDays = studentRecs.filter(r => r.status === 'present').length;
    const onDutyDays = studentRecs.filter(r => r.status === 'on_duty').length;
    const lateDays = studentRecs.filter(r => r.status === 'late').length;
    const medicalDays = studentRecs.filter(r => r.status === 'medical_leave').length;
    const absentDays = studentRecs.filter(r => r.status === 'absent').length;

    const effectivePresent = presentDays + onDutyDays + (lateDays * 0.5) + medicalDays;
    const percentage = totalDays > 0 ? Math.round((effectivePresent / totalDays) * 100) : 0;

    return {
      studentId,
      studentName: student.name,
      registerNumber: student.registerNumber,
      departmentId: student.departmentId,
      subjectId,
      totalDays,
      presentDays,
      onDutyDays,
      lateDays,
      medicalDays,
      absentDays,
      effectivePresent,
      percentage,
      isLowAttendance: percentage < (settings.attendanceThreshold || 75),
    };
  },

  async predictEligibility(studentId: string, targetPerc = 75): Promise<EligibilityPrediction> {
    await sleep(60);
    const students = getItem<Student[]>(K_STUDENTS, []);
    const depts = getItem<Department[]>(K_DEPTS, []);
    const student = students.find(s => s.id === studentId);
    const dept = depts.find(d => d.id === student?.departmentId);

    const metrics = await this.calculateStudentMetrics(studentId);
    const totalConducted = metrics?.totalDays || 0;
    const totalAttended = metrics?.effectivePresent || 0;
    const currentPerc = metrics?.percentage || 0;

    let status: 'safe' | 'warning' | 'critical' = 'safe';
    if (currentPerc < 60) status = 'critical';
    else if (currentPerc < targetPerc) status = 'warning';

    let classesNeededToReachTarget = 0;
    let classesCanSafelyMiss = 0;

    if (currentPerc < targetPerc) {
      const numerator = (targetPerc * totalConducted) - (100 * totalAttended);
      const denominator = 100 - targetPerc;
      classesNeededToReachTarget = Math.max(0, Math.ceil(numerator / denominator));
    } else {
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

  async markAttendance(data: {
    departmentId: string;
    year: number;
    section: string;
    subjectId: string;
    facultyId?: string;
    date: string;
    period?: number;
    periodLabel?: string;
    records: { studentId: string; status: AttendanceStatus; time?: string; remarks?: string }[];
  }, user?: any) {
    await sleep(100);
    const sessions = getItem<AttendanceSession[]>(K_SESSIONS, []);
    const records = getItem<AttendanceRecord[]>(K_RECORDS, []);
    const students = getItem<Student[]>(K_STUDENTS, []);

    let existing = sessions.find(s =>
      s.departmentId === data.departmentId &&
      s.year === Number(data.year) &&
      s.section === data.section &&
      s.subjectId === data.subjectId &&
      s.date === data.date &&
      (data.period !== undefined ? s.period === Number(data.period) : true)
    );

    let sessionId = existing?.id;
    const isUpdate = !!existing;

    const presentCount = data.records.filter(r => r.status === 'present' || r.status === 'on_duty').length;
    const absentCount = data.records.filter(r => r.status === 'absent').length;

    if (!existing) {
      sessionId = `sess_${Date.now()}`;
      existing = {
        id: sessionId,
        departmentId: data.departmentId,
        year: Number(data.year),
        section: data.section,
        subjectId: data.subjectId,
        facultyId: data.facultyId || user?.facultyId || 'f1',
        date: data.date,
        period: data.period ? Number(data.period) : undefined,
        periodLabel: data.periodLabel || (data.period ? `Period ${data.period}` : 'Full Day'),
        totalStudents: data.records.length,
        presentCount,
        absentCount,
        createdAt: new Date().toISOString(),
      };
      sessions.push(existing);
    } else {
      existing.totalStudents = data.records.length;
      existing.presentCount = presentCount;
      existing.absentCount = absentCount;
      if (data.periodLabel) existing.periodLabel = data.periodLabel;
    }

    // Remove existing records for this session
    const filteredRecords = records.filter(r => r.sessionId !== sessionId);
    const newRecords: AttendanceRecord[] = data.records.map(r => ({
      id: `rec_${Date.now()}_${r.studentId}`,
      sessionId: sessionId!,
      studentId: r.studentId,
      status: r.status,
      time: r.time || (r.status === 'present' ? new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : undefined),
      remarks: r.remarks,
      createdAt: data.date,
    }));

    setItem(K_SESSIONS, sessions);
    setItem(K_RECORDS, [...filteredRecords, ...newRecords]);

    // Recalculate student percentages
    data.records.forEach(r => {
      const idx = students.findIndex(s => s.id === r.studentId);
      if (idx !== -1) {
        const allRecs = [...filteredRecords, ...newRecords].filter(rec => rec.studentId === r.studentId);
        const total = allRecs.length;
        const effective = allRecs.filter(rec => rec.status === 'present' || rec.status === 'on_duty' || rec.status === 'medical_leave').length +
          (allRecs.filter(rec => rec.status === 'late').length * 0.5);
        students[idx].attendancePercentage = total > 0 ? Math.round((effective / total) * 100) : 0;
      }
    });
    setItem(K_STUDENTS, students);

    await this.log(
      isUpdate ? 'ATTENDANCE_SESSION_UPDATED' : 'ATTENDANCE_SESSION_SAVED',
      'attendance',
      `${isUpdate ? 'Updated' : 'Recorded'} attendance for Year ${data.year}-${data.section} on ${data.date} (${presentCount} present, ${absentCount} absent).`,
      user,
      sessionId
    );

    return { session: existing, presentCount, absentCount, total: data.records.length };
  },

  async getLeaveRequests(studentId?: string, status?: string): Promise<LeaveRequest[]> {
    await sleep(60);
    let leaves = getItem<LeaveRequest[]>(K_LEAVES, []);
    if (studentId) leaves = leaves.filter(l => l.studentId === studentId);
    if (status) leaves = leaves.filter(l => l.status === status);
    return leaves.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async applyLeave(data: Omit<LeaveRequest, 'id' | 'status' | 'createdAt'>, user?: any): Promise<LeaveRequest> {
    await sleep(100);
    const leaves = getItem<LeaveRequest[]>(K_LEAVES, []);
    const newLeave: LeaveRequest = {
      id: `leave_${Date.now()}`,
      ...data,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    leaves.unshift(newLeave);
    setItem(K_LEAVES, leaves);

    await this.log(
      'LEAVE_APPLICATION_SUBMITTED',
      'leave',
      `Applied for ${data.type} from ${data.startDate} to ${data.endDate} for ${data.studentName}`,
      user,
      newLeave.id
    );

    return newLeave;
  },

  async updateLeaveStatus(id: string, status: 'approved' | 'rejected', user?: any, remarks?: string): Promise<LeaveRequest> {
    await sleep(100);
    const leaves = getItem<LeaveRequest[]>(K_LEAVES, []);
    const idx = leaves.findIndex(l => l.id === id);
    if (idx === -1) throw new Error('Leave request not found.');

    const leave = leaves[idx];
    leave.status = status;
    leave.approvedBy = user?.id || 'admin';
    leave.approvedByName = user?.name || 'Administrator';
    leave.approvedAt = new Date().toISOString();

    if (status === 'approved') {
      const sessions = getItem<AttendanceSession[]>(K_SESSIONS, []);
      const records = getItem<AttendanceRecord[]>(K_RECORDS, []);
      const students = getItem<Student[]>(K_STUDENTS, []);

      const targetStatus: AttendanceStatus = leave.type === 'on_duty' ? 'on_duty' : 'medical_leave';
      let count = 0;

      sessions.forEach(sess => {
        if (sess.date >= leave.startDate && sess.date <= leave.endDate) {
          const rec = records.find(r => r.sessionId === sess.id && r.studentId === leave.studentId);
          if (rec) {
            rec.status = targetStatus;
            rec.remarks = `Auto-approved via ${leave.type}: ${remarks || leave.reason}`;
            count++;
          }
        }
      });

      setItem(K_RECORDS, records);

      // Recalculate
      const sIdx = students.findIndex(s => s.id === leave.studentId);
      if (sIdx !== -1) {
        const sRecs = records.filter(r => r.studentId === leave.studentId);
        const total = sRecs.length;
        const effective = sRecs.filter(r => r.status === 'present' || r.status === 'on_duty' || r.status === 'medical_leave').length +
          (sRecs.filter(r => r.status === 'late').length * 0.5);
        students[sIdx].attendancePercentage = total > 0 ? Math.round((effective / total) * 100) : 0;
        setItem(K_STUDENTS, students);
      }

      await this.log(
        'LEAVE_APPLICATION_APPROVED',
        'leave',
        `Approved ${leave.type} for ${leave.studentName}. Updated ${count} records.`,
        user,
        leave.id
      );
    } else {
      await this.log('LEAVE_APPLICATION_REJECTED', 'leave', `Rejected ${leave.type} for ${leave.studentName}`, user, leave.id);
    }

    setItem(K_LEAVES, leaves);
    return leave;
  },

  async getDefaulters(threshold = 75) {
    await sleep(80);
    const students = getItem<Student[]>(K_STUDENTS, []);
    const depts = getItem<Department[]>(K_DEPTS, []);

    const defaulters: any[] = [];
    for (const s of students.filter(st => st.enrollmentStatus === 'active')) {
      const metrics = await this.calculateStudentMetrics(s.id);
      if ((metrics?.percentage || 0) < threshold) {
        const prediction = await this.predictEligibility(s.id, threshold);
        const dept = depts.find(d => d.id === s.departmentId);
        defaulters.push({
          ...s,
          department: dept,
          metrics,
          prediction,
          riskLevel: (metrics?.percentage || 0) < 60 ? 'critical' : 'warning',
        });
      }
    }
    return defaulters.sort((a, b) => (a.metrics?.percentage || 0) - (b.metrics?.percentage || 0));
  },
};
