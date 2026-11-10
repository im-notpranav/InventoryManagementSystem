// College departments. Keep in sync with backend/src/utils/departments.js.
export const DEPARTMENTS = ['CSM(AIML)', 'CSE', 'CSD', 'CSIT', 'IT', 'ECE', 'EEE', 'MECH', 'AERO', 'CIVIL', 'H&S', 'MBA'];
export const DEFAULT_DEPARTMENT = 'CSM(AIML)';

// Roles that belong to a department. Watchman, Accountant and Vendor are college-wide.
export const DEPARTMENT_ROLES = ['Admin', 'Department User'];

// Value the Users form sends for an Admin with no department (college-wide super admin).
export const ALL_DEPARTMENTS = 'ALL';

/** Super admin = Admin (HOD role) without a department: sees every department. */
export const isSuperAdmin = (user) => user?.role === 'Admin' && !user?.department;
