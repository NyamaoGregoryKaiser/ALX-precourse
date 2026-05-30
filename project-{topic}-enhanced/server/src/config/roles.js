const allRoles = {
  member: [],
  projectOwner: ['getUsers', 'manageProjects', 'getProjects', 'manageTasks', 'getTasks', 'manageComments', 'getComments'],
  admin: ['getUsers', 'manageUsers', 'getProjects', 'manageProjects', 'getTasks', 'manageTasks', 'getComments', 'manageComments'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};