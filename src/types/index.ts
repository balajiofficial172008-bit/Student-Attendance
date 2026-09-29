export type UserRole = 'admin' | 'faculty';
export type Gender = 'male' | 'female' | 'other';
export type EnrollmentStatus = 'active' | 'inactive' | 'graduated' | 'dropped';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'on_duty' | 'medical_leave';
export type NotificationType = 'alert' | 'success' | 'info' | 'warning';
export type FacultyStatus = 'active' | 'inactive' | 'on_leave';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  facultyId?: string;
  token?: string;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  hodName: string;
  hodEmail?: string;
  description?: string;
  createdAt: string;
}

export interface Faculty {
  id: string;
  facultyId: string;
  name: string;
  email: string;
  phone: string;
  departmentId: string;
  department?: Department;
  assignedSubjects: string[];
  assignedClasses: string[];
  status: FacultyStatus;
  qualification?: string;
  experience?: number;
  avatar?: string;
  joiningDate: string;
  createdAt: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  department?: Department;
  semester: number;
  facultyId?: string;
  faculty?: Faculty;
  credits: number;
  type: 'theory' | 'lab' | 'elective';
  createdAt: string;
}

export interface Student {
  id: string;
  registerNumber: string;
  name: string;
  email: string;
  phone: string;
  gender: Gender;
  dateOfBirth: string;
  address: string;
  departmentId: string;
  department?: Department;
  year: number;
  semester: number;
  section: string;
  batch: string;
  admissionYear: number;
  bloodGroup: string;
  guardianName: string;
  guardianPhone: string;
  emergencyContact: string;
  enrollmentStatus: EnrollmentStatus;
  photoUrl?: string;
  attendancePercentage?: number;
  createdAt: string;
}

export interface AttendanceSession {
  id: string;
  departmentId: string;
  department?: Department;
  year: number;
  section: string;
  subjectId: string;
  subject?: Subject;
  facultyId: string;
  faculty?: Faculty;
  date: string;
  period?: number;
  periodLabel?: string;
  startTime?: string;
  endTime?: string;
  totalStudents?: number;
  presentCount?: number;
  absentCount?: number;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  session?: AttendanceSession;
  studentId: string;
  student?: Student;
  status: AttendanceStatus;
  time?: string;
  remarks?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface AttendanceSummary {
  studentId: string;
  studentName: string;
  registerNumber: string;
  departmentId: string;
  subjectId?: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  percentage: number;
}

export interface DashboardStats {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  attendancePercentage: number;
  totalDepartments: number;
  totalClasses: number;
  totalFaculty: number;
  totalSubjects: number;
  lowAttendanceCount: number;
}

export interface AttendanceFilter {
  departmentId?: string;
  year?: number;
  section?: string;
  subjectId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  studentId?: string;
}

export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface StudentFormData {
  registerNumber: string;
  name: string;
  email: string;
  phone: string;
  gender: Gender;
  dateOfBirth: string;
  address: string;
  departmentId: string;
  year: number;
  semester: number;
  section: string;
  batch: string;
  admissionYear: number;
  bloodGroup: string;
  guardianName: string;
  guardianPhone: string;
  emergencyContact: string;
  enrollmentStatus: EnrollmentStatus;
  photoUrl?: string;
}

export interface FacultyFormData {
  facultyId: string;
  name: string;
  email: string;
  phone: string;
  departmentId: string;
  qualification?: string;
  experience?: number;
  joiningDate: string;
  status: FacultyStatus;
}

export interface SubjectFormData {
  code: string;
  name: string;
  departmentId: string;
  semester: number;
  facultyId?: string;
  credits: number;
  type: 'theory' | 'lab' | 'elective';
}

export interface DepartmentFormData {
  name: string;
  code: string;
  hodName: string;
  hodEmail?: string;
  description?: string;
}

export interface Settings {
  collegeName?: string;
  campusName?: string;
  attendanceThreshold: number;
  theme: 'light' | 'dark';
  emailNotifications: boolean;
  lowAttendanceAlert: boolean;
  autoMarkAbsent: boolean;
  workingDaysPerWeek: number;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: 'attendance' | 'student' | 'leave' | 'auth' | 'settings' | 'system';
  entityId?: string;
  details: string;
  userId: string;
  userName: string;
  userRole: string;
  timestamp: string;
  ip?: string;
}

export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  registerNumber: string;
  departmentId: string;
  type: 'on_duty' | 'medical_leave' | 'casual_leave';
  startDate: string;
  endDate: string;
  reason: string;
  documentUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface EligibilityPrediction {
  studentId: string;
  studentName: string;
  registerNumber: string;
  departmentName?: string;
  currentPercentage: number;
  targetPercentage: number;
  totalConducted: number;
  totalAttended: number;
  status: 'safe' | 'warning' | 'critical';
  classesNeededToReachTarget: number;
  classesCanSafelyMiss: number;
  advice: string;
}

export interface BackendStatusInfo {
  mode: 'live_api' | 'resilient_mock';
  url: string;
  latencyMs: number;
  serverTime?: string;
  uptime?: number;
  connected: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  meta?: Record<string, any>;
  error?: string;
}

