import {
  Department, Faculty, Subject, Student,
  AttendanceSession, AttendanceRecord, Notification, User, Settings
} from '../types';

const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];

export const seedDepartments: Department[] = [
  { id: 'd1', name: 'Computer Science and Engineering', code: 'CSE', hodName: 'Dr. Ramesh Kumar', hodEmail: 'ramesh@college.edu', description: 'Department of CSE', createdAt: '2020-01-01' },
  { id: 'd2', name: 'Information Technology', code: 'IT', hodName: 'Dr. Priya Sharma', hodEmail: 'priya@college.edu', description: 'Department of IT', createdAt: '2020-01-01' },
  { id: 'd3', name: 'Electronics and Communication Engineering', code: 'ECE', hodName: 'Dr. Suresh Patel', hodEmail: 'suresh@college.edu', description: 'Department of ECE', createdAt: '2020-01-01' },
  { id: 'd4', name: 'Mechanical Engineering', code: 'ME', hodName: 'Dr. Arjun Singh', hodEmail: 'arjun@college.edu', description: 'Department of ME', createdAt: '2020-01-01' },
  { id: 'd5', name: 'Civil Engineering', code: 'CE', hodName: 'Dr. Kavya Nair', hodEmail: 'kavya@college.edu', description: 'Department of CE', createdAt: '2020-01-01' },
  { id: 'd6', name: 'Artificial Intelligence and Data Science', code: 'AIDS', hodName: 'Dr. Meera Iyer', hodEmail: 'meera@college.edu', description: 'Department of AIDS', createdAt: '2021-01-01' },
];

export const seedFaculty: Faculty[] = [
  { id: 'f1', facultyId: 'FAC001', name: 'Dr. Anil Verma', email: 'anil@college.edu', phone: '9876543210', departmentId: 'd1', assignedSubjects: ['sub1', 'sub2'], assignedClasses: ['CSE-III-A', 'CSE-IV-B'], status: 'active', qualification: 'Ph.D Computer Science', experience: 12, joiningDate: '2012-06-01', createdAt: '2012-06-01' },
  { id: 'f2', facultyId: 'FAC002', name: 'Prof. Sunita Rao', email: 'sunita@college.edu', phone: '9876543211', departmentId: 'd1', assignedSubjects: ['sub3'], assignedClasses: ['CSE-I-A'], status: 'active', qualification: 'M.Tech CSE', experience: 8, joiningDate: '2016-07-01', createdAt: '2016-07-01' },
  { id: 'f3', facultyId: 'FAC003', name: 'Dr. Ravi Chandran', email: 'ravi@college.edu', phone: '9876543212', departmentId: 'd2', assignedSubjects: ['sub4', 'sub5'], assignedClasses: ['IT-II-A', 'IT-III-B'], status: 'active', qualification: 'Ph.D IT', experience: 10, joiningDate: '2014-06-01', createdAt: '2014-06-01' },
  { id: 'f4', facultyId: 'FAC004', name: 'Prof. Deepa Menon', email: 'deepa@college.edu', phone: '9876543213', departmentId: 'd3', assignedSubjects: ['sub6'], assignedClasses: ['ECE-II-A'], status: 'active', qualification: 'M.E ECE', experience: 6, joiningDate: '2018-07-01', createdAt: '2018-07-01' },
  { id: 'f5', facultyId: 'FAC005', name: 'Dr. Karthik Raja', email: 'karthik@college.edu', phone: '9876543214', departmentId: 'd6', assignedSubjects: ['sub7', 'sub8'], assignedClasses: ['AIDS-I-A', 'AIDS-II-A'], status: 'active', qualification: 'Ph.D AI/ML', experience: 7, joiningDate: '2019-01-01', createdAt: '2019-01-01' },
  { id: 'f6', facultyId: 'FAC006', name: 'Prof. Lakshmi Priya', email: 'lakshmi@college.edu', phone: '9876543215', departmentId: 'd4', assignedSubjects: ['sub9'], assignedClasses: ['ME-III-A'], status: 'on_leave', qualification: 'M.E Mechanical', experience: 9, joiningDate: '2015-06-01', createdAt: '2015-06-01' },
];

export const seedSubjects: Subject[] = [
  { id: 'sub1', code: 'CS301', name: 'Data Structures and Algorithms', departmentId: 'd1', semester: 3, facultyId: 'f1', credits: 4, type: 'theory', createdAt: '2020-01-01' },
  { id: 'sub2', code: 'CS302', name: 'Database Management Systems', departmentId: 'd1', semester: 3, facultyId: 'f1', credits: 4, type: 'theory', createdAt: '2020-01-01' },
  { id: 'sub3', code: 'CS101', name: 'Programming Fundamentals', departmentId: 'd1', semester: 1, facultyId: 'f2', credits: 3, type: 'theory', createdAt: '2020-01-01' },
  { id: 'sub4', code: 'IT201', name: 'Web Technology', departmentId: 'd2', semester: 2, facultyId: 'f3', credits: 3, type: 'theory', createdAt: '2020-01-01' },
  { id: 'sub5', code: 'IT301', name: 'Network Security', departmentId: 'd2', semester: 3, facultyId: 'f3', credits: 4, type: 'theory', createdAt: '2020-01-01' },
  { id: 'sub6', code: 'EC201', name: 'Digital Electronics', departmentId: 'd3', semester: 2, facultyId: 'f4', credits: 4, type: 'theory', createdAt: '2020-01-01' },
  { id: 'sub7', code: 'AI101', name: 'Introduction to AI', departmentId: 'd6', semester: 1, facultyId: 'f5', credits: 3, type: 'theory', createdAt: '2021-01-01' },
  { id: 'sub8', code: 'AI201', name: 'Machine Learning', departmentId: 'd6', semester: 2, facultyId: 'f5', credits: 4, type: 'theory', createdAt: '2021-01-01' },
  { id: 'sub9', code: 'ME301', name: 'Thermodynamics', departmentId: 'd4', semester: 3, facultyId: 'f6', credits: 4, type: 'theory', createdAt: '2020-01-01' },
  { id: 'sub10', code: 'CS401', name: 'Operating Systems', departmentId: 'd1', semester: 4, facultyId: 'f1', credits: 4, type: 'theory', createdAt: '2020-01-01' },
  { id: 'sub11', code: 'CS302L', name: 'DBMS Laboratory', departmentId: 'd1', semester: 3, facultyId: 'f2', credits: 2, type: 'lab', createdAt: '2020-01-01' },
  { id: 'sub12', code: 'CS501', name: 'Computer Networks', departmentId: 'd1', semester: 5, facultyId: 'f1', credits: 4, type: 'theory', createdAt: '2020-01-01' },
];

const studentNames = [
  'Aarav Sharma', 'Priya Patel', 'Rohan Kumar', 'Ananya Singh', 'Vikram Nair',
  'Sneha Iyer', 'Arjun Reddy', 'Pooja Mehta', 'Kiran Rao', 'Divya Krishnan',
  'Rahul Verma', 'Nisha Jain', 'Suresh Pillai', 'Kavitha Menon', 'Arun Sinha',
  'Meera Bose', 'Ajay Gupta', 'Riya Kapoor', 'Nikhil Tiwari', 'Swati Pandey',
  'Deepak Mishra', 'Anjali Das', 'Varun Malhotra', 'Shivani Choudhury', 'Sanjay Thakur',
  'Pallavi Srivastava', 'Manish Yadav', 'Sunita Garg', 'Pratik Shah', 'Neha Dubey',
  'Rajesh Patil', 'Shreya Banerjee', 'Vivek Chauhan', 'Tanya Bhatt', 'Mohit Saxena',
  'Kritika Aggarwal', 'Sachin Rawat', 'Ishita Mukherjee', 'Gaurav Pandita', 'Rekha Negi',
  'Ashish Bhardwaj', 'Sonal Vashisht', 'Harshit Rajput', 'Preeti Saini', 'Tarun Bhatt',
  'Navya Sethi', 'Yash Khanna', 'Simran Arora', 'Tushar Luthra', 'Shreya Walia'
];

const sections = ['A', 'B', 'C'];
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const deptIds = ['d1', 'd2', 'd3', 'd6'];

function genDob(year: number): string {
  const d = new Date(year, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
  return d.toISOString().split('T')[0];
}

export const seedStudents: Student[] = studentNames.map((name, i) => {
  const deptId = deptIds[i % deptIds.length];
  const year = (i % 4) + 1;
  const semester = year * 2 - (i % 2);
  const idx = i + 1;
  const regNo = `${2020 + (4 - year)}${String(idx).padStart(4, '0')}`;
  return {
    id: `stu${idx}`,
    registerNumber: regNo,
    name,
    email: `${name.split(' ')[0].toLowerCase()}${idx}@student.college.edu`,
    phone: `98765${String(43200 + idx).padStart(5, '0')}`,
    gender: i % 3 === 1 ? 'female' : 'male',
    dateOfBirth: genDob(2000 + (i % 5)),
    address: `${idx * 12}, College Road, Chennai - ${600000 + (i % 100)}`,
    departmentId: deptId,
    year,
    semester,
    section: sections[i % 3],
    batch: `${2020 + (4 - year)}-${2024 + (4 - year)}`,
    admissionYear: 2020 + (4 - year),
    bloodGroup: bloodGroups[i % bloodGroups.length],
    guardianName: `Parent of ${name.split(' ')[0]}`,
    guardianPhone: `98765${String(12000 + idx).padStart(5, '0')}`,
    emergencyContact: `98765${String(99000 + idx).padStart(5, '0')}`,
    enrollmentStatus: i === 7 || i === 15 ? 'inactive' : 'active',
    attendancePercentage: 60 + Math.round(Math.random() * 38),
    createdAt: `${2020 + (4 - year)}-06-15`,
  };
});

// Generate realistic attendance sessions for last 30 days
const sessionSubjectMap: Record<string, string[]> = {
  'd1': ['sub1', 'sub2', 'sub10', 'sub11'],
  'd2': ['sub4', 'sub5'],
  'd3': ['sub6'],
  'd6': ['sub7', 'sub8'],
};

export const seedSessions: AttendanceSession[] = [];
export const seedRecords: AttendanceRecord[] = [];

let sessionCounter = 1;
let recordCounter = 1;

// Generate 30 days of sessions
for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
  const date = new Date(Date.now() - dayOffset * 86400000);
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

  const dateStr = date.toISOString().split('T')[0];

  deptIds.forEach(deptId => {
    const subjects = sessionSubjectMap[deptId] || [];
    subjects.slice(0, 2).forEach(subjectId => {
      [1, 2, 3].forEach(year => {
        sections.slice(0, 2).forEach(section => {
          const sessionId = `sess${sessionCounter++}`;
          const facultyId = deptId === 'd1' ? 'f1' : deptId === 'd2' ? 'f3' : deptId === 'd3' ? 'f4' : 'f5';

          seedSessions.push({
            id: sessionId,
            departmentId: deptId,
            year,
            section,
            subjectId,
            facultyId,
            date: dateStr,
            startTime: '09:00',
            endTime: '10:00',
            createdAt: dateStr,
          });

          // Add attendance records for students in this dept/year/section
          const relevantStudents = seedStudents.filter(
            s => s.departmentId === deptId && s.year === year && s.section === section
          );

          relevantStudents.forEach(student => {
            const attendancePerc = student.attendancePercentage || 75;
            // Simulate attendance based on student's overall percentage
            const isPresent = Math.random() * 100 < attendancePerc;
            seedRecords.push({
              id: `rec${recordCounter++}`,
              sessionId,
              studentId: student.id,
              status: isPresent ? 'present' : 'absent',
              time: isPresent ? `09:${String(Math.floor(Math.random() * 15)).padStart(2, '0')} AM` : undefined,
              createdAt: dateStr,
            });
          });
        });
      });
    });
  });
}

export const seedUsers: User[] = [
  { id: 'u1', email: 'admin@college.edu', name: 'Dr. Admin Singh', role: 'admin', avatar: undefined, createdAt: '2020-01-01' },
  { id: 'u2', email: 'anil@college.edu', name: 'Dr. Anil Verma', role: 'faculty', facultyId: 'f1', avatar: undefined, createdAt: '2020-01-01' },
  { id: 'u3', email: 'sunita@college.edu', name: 'Prof. Sunita Rao', role: 'faculty', facultyId: 'f2', avatar: undefined, createdAt: '2020-01-01' },
];

export const seedPasswords: Record<string, string> = {
  'admin@college.edu': 'admin123',
  'anil@college.edu': 'faculty123',
  'sunita@college.edu': 'faculty123',
};

export const seedNotifications: Notification[] = [
  { id: 'n1', userId: 'u1', title: 'Low Attendance Alert', message: '5 students have attendance below 75% in CSE department.', type: 'alert', read: false, createdAt: today },
  { id: 'n2', userId: 'u1', title: 'Attendance Marked', message: 'Attendance for CS301 - Section A has been successfully recorded.', type: 'success', read: false, createdAt: today },
  { id: 'n3', userId: 'u1', title: 'New Student Added', message: 'Priya Patel (2024001) has been successfully enrolled.', type: 'info', read: true, createdAt: yesterday },
  { id: 'n4', userId: 'u1', title: 'Report Generated', message: 'Monthly attendance report for August 2025 has been generated.', type: 'success', read: true, createdAt: yesterday },
  { id: 'n5', userId: 'u1', title: 'Attendance Updated', message: 'Attendance records for IT201 on ' + twoDaysAgo + ' have been updated.', type: 'info', read: true, createdAt: twoDaysAgo },
  { id: 'n6', userId: 'u1', title: 'System Maintenance', message: 'Scheduled maintenance on Sunday 2AM-4AM. System may be unavailable.', type: 'warning', read: false, createdAt: twoDaysAgo },
];

export const seedSettings: Settings = {
  attendanceThreshold: 75,
  theme: 'light',
  emailNotifications: true,
  lowAttendanceAlert: true,
  autoMarkAbsent: false,
  workingDaysPerWeek: 5,
};
