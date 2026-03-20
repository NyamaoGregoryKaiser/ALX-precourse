const USER_ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  MEMBER: 'MEMBER'
};

const TASK_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  OVERDUE: 'OVERDUE'
};

const CACHE_KEYS = {
  ALL_PROJECTS: 'all_projects',
  PROJECT_BY_ID: (id) => `project_${id}`,
  USER_BY_ID: (id) => `user_${id}`
  // Add more cache keys as needed
};

module.exports = {
  USER_ROLES,
  TASK_STATUS,
  CACHE_KEYS
};