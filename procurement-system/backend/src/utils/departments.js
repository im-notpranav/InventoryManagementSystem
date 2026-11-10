// College departments: the single list used for users, scoping and stock.
// Keep in sync with frontend/src/lib/departments.js.
const DEPARTMENTS = [
  { name: 'CSM(AIML)', code: 'CSM' },
  { name: 'CSE', code: 'CSE' },
  { name: 'CSD', code: 'CSD' },
  { name: 'CSIT', code: 'CSIT' },
  { name: 'IT', code: 'IT' },
  { name: 'ECE', code: 'ECE' },
  { name: 'EEE', code: 'EEE' },
  { name: 'MECH', code: 'MECH' },
  { name: 'AERO', code: 'AERO' },
  { name: 'CIVIL', code: 'CIVIL' },
  { name: 'H&S', code: 'HS' },
  { name: 'MBA', code: 'MBA' },
];

const DEFAULT_DEPARTMENT = 'CSM(AIML)';
const DEPARTMENT_NAMES = DEPARTMENTS.map((d) => d.name);

// Roles that belong to a department. Watchman, Accountant and Vendor are college-wide.
const DEPARTMENT_ROLES = ['Admin', 'Department User'];

const key = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const ALIASES = {
  CSMAIML: 'CSM(AIML)', CSM: 'CSM(AIML)', AIML: 'CSM(AIML)', CSEAIML: 'CSM(AIML)',
  INFORMATIONTECHNOLOGY: 'IT',
  HS: 'H&S', HUMANITIES: 'H&S', HUMANITIESANDSCIENCES: 'H&S',
  MECHANICAL: 'MECH', CIVILENGINEERING: 'CIVIL', AERONAUTICAL: 'AERO',
};
DEPARTMENTS.forEach((d) => { ALIASES[key(d.name)] = d.name; });

/** Canonical department name, or null if the value is not a known department. */
const normalizeDepartment = (value) => ALIASES[key(value)] || null;

/** Short code used in PR / WO numbers (e.g. CSM(AIML) → CSM). */
const departmentCode = (value) => {
  const name = normalizeDepartment(value);
  return DEPARTMENTS.find((d) => d.name === name)?.code || 'GEN';
};

/** A super admin is an Admin (HOD role) with no department: sees every department. */
const isSuperAdmin = (user) => user?.role === 'Admin' && !user?.department;

/**
 * Prisma `where` fragment limiting stock to the user's department.
 * Users without a department (super admin, watchman, accountant) see all,
 * optionally narrowed with ?department=.
 */
const inventoryScope = (user, requested) => {
  if (user?.department && DEPARTMENT_ROLES.includes(user.role)) return { department: user.department };
  const wanted = normalizeDepartment(requested);
  return wanted ? { department: wanted } : {};
};

module.exports = {
  DEPARTMENTS,
  DEPARTMENT_NAMES,
  DEFAULT_DEPARTMENT,
  DEPARTMENT_ROLES,
  normalizeDepartment,
  departmentCode,
  isSuperAdmin,
  inventoryScope,
};
