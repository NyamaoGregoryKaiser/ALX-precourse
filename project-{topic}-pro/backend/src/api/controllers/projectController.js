```javascript
const Project = require('../../models/Project');
const Task = require('../../models/Task');
const User = require('../../models/User');
const { CustomError } = require('../../utils/error');
const asyncHandler = require('./asyncHandler');
const logger = require('../../utils/logger');

/**
 * Check if a user is a member (or owner) of a project
 * @param {object} project - Mongoose Project document
 * @param {string} userId - ID of the user to check
 * @returns {boolean}
 */
const isUserProjectMember = (project, userId) => {
  if (!project || !userId) return false;
  return project.owner.equals(userId) || project.members.some(member => member.user.equals(userId));
};

/**
 * Check if a user has a specific role (or owner) within a project
 * @param {object} project - Mongoose Project document
 * @param {string} userId - ID of the user to check
 * @param {string[]} allowedRoles - Array of roles allowed ('owner' can be included)
 * @returns {boolean}
 */
const hasProjectRole = (project, userId, allowedRoles) => {
  if (!project || !userId || !allowedRoles || allowedRoles.length === 0) return false;

  if (allowedRoles.includes('owner') && project.owner.equals(userId)) {
    return true;
  }

  const member = project.members.find(m => m.user.equals(userId));
  return member && allowedRoles.includes(member.role);
};


/**
 * @desc    Create a new project
 * @route   POST /api/v1/projects
 * @access  Private/Manager, Admin
 */
exports.createProject = asyncHandler(async (req, res, next) => {
  // The owner of the project is the authenticated user
  req.body.owner = req.user.id;

  const project = await Project.create(req.body);

  logger.info(`Project ${project._id} created by user ${req.user.id}`);
  res.status(201).json({
    success: true,
    data: project,
  });
});

/**
 * @desc    Get all projects (where user is owner or member)
 * @route   GET /api/v1/projects
 * @access  Private
 */
exports.getProjects = asyncHandler(async (req, res, next) => {
  const projects = await Project.find({
    $or: [
      { owner: req.user.id },
      { 'members.user': req.user.id }
    ]
  }).populate('owner', 'username email').populate('members.user', 'username email');

  res.status(200).json({
    success: true,
    count: projects.length,
    data: projects,
  });
});

/**
 * @desc    Get single project by ID
 * @route   GET /api/v1/projects/:id
 * @access  Private
 */
exports.getProjectById = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id)
    .populate('owner', 'username email')
    .populate('members.user', 'username email');

  if (!project) {
    return next(new CustomError(`Project not found with id of ${req.params.id}`, 404));
  }

  // Ensure user is owner or member of the project
  if (!isUserProjectMember(project, req.user.id) && req.user.role !== 'admin') {
    return next(new CustomError(`User ${req.user.id} is not authorized to access project ${req.params.id}`, 403));
  }

  res.status(200).json({
    success: true,
    data: project,
  });
});

/**
 * @desc    Update project
 * @route   PUT /api/v1/projects/:id
 * @access  Private/Manager, Admin
 */
exports.updateProject = asyncHandler(async (req, res, next) => {
  let project = await Project.findById(req.params.id);

  if (!project) {
    return next(new CustomError(`Project not found with id of ${req.params.id}`, 404));
  }

  // Ensure user is owner or admin
  if (!project.owner.equals(req.user.id) && req.user.role !== 'admin') {
    return next(new CustomError(`User ${req.user.id} is not authorized to update project ${req.params.id}`, 403));
  }

  project = await Project.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate('owner', 'username email')
    .populate('members.user', 'username email');

  logger.info(`Project ${project._id} updated by user ${req.user.id}`);
  res.status(200).json({
    success: true,
    data: project,
  });
});

/**
 * @desc    Delete project
 * @route   DELETE /api/v1/projects/:id
 * @access  Private/Manager, Admin
 */
exports.deleteProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new CustomError(`Project not found with id of ${req.params.id}`, 404));
  }

  // Ensure user is owner or admin
  if (!project.owner.equals(req.user.id) && req.user.role !== 'admin') {
    return next(new CustomError(`User ${req.user.id} is not authorized to delete project ${req.params.id}`, 403));
  }

  // Delete all associated tasks first
  await Task.deleteMany({ projectId: req.params.id });

  await project.deleteOne();

  logger.info(`Project ${req.params.id} and its tasks deleted by user ${req.user.id}`);
  res.status(200).json({
    success: true,
    data: {},
    message: 'Project and associated tasks deleted successfully',
  });
});

/**
 * @desc    Add a member to a project
 * @route   POST /api/v1/projects/:id/members
 * @access  Private/Manager, Admin
 */
exports.addProjectMember = asyncHandler(async (req, res, next) => {
  const { userId, role } = req.body; // userId to add, role for that user in the project

  let project = await Project.findById(req.params.id);

  if (!project) {
    return next(new CustomError(`Project not found with id of ${req.params.id}`, 404));
  }

  // Ensure user is project owner or admin
  if (!project.owner.equals(req.user.id) && req.user.role !== 'admin') {
    return next(new CustomError(`User ${req.user.id} is not authorized to add members to project ${req.params.id}`, 403));
  }

  // Check if target user exists
  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return next(new CustomError(`User with ID ${userId} not found`, 404));
  }

  // Check if user is already a member
  const isMember = project.members.some(member => member.user.equals(userId));
  if (isMember) {
    return next(new CustomError(`User ${userId} is already a member of this project`, 400));
  }

  project.members.push({ user: userId, role });
  await project.save();

  logger.info(`User ${userId} added to project ${project._id} with role ${role} by ${req.user.id}`);

  // Re-populate to send back full user objects
  project = await Project.findById(project._id)
    .populate('owner', 'username email')
    .populate('members.user', 'username email');

  res.status(200).json({
    success: true,
    data: project,
  });
});

/**
 * @desc    Remove a member from a project
 * @route   DELETE /api/v1/projects/:projectId/members/:memberId
 * @access  Private/Manager, Admin
 */
exports.removeProjectMember = asyncHandler(async (req, res, next) => {
  const { projectId, memberId } = req.params;

  let project = await Project.findById(projectId);

  if (!project) {
    return next(new CustomError(`Project not found with id of ${projectId}`, 404));
  }

  // Ensure user is project owner or admin
  if (!project.owner.equals(req.user.id) && req.user.role !== 'admin') {
    return next(new CustomError(`User ${req.user.id} is not authorized to remove members from project ${projectId}`, 403));
  }

  // Prevent removing the project owner
  if (project.owner.equals(memberId)) {
    return next(new CustomError('Cannot remove project owner from members list.', 400));
  }

  // Check if the member exists in the project
  const initialMemberCount = project.members.length;
  project.members = project.members.filter(member => !member.user.equals(memberId));

  if (project.members.length === initialMemberCount) {
    return next(new CustomError(`User ${memberId} is not a member of project ${projectId}`, 404));
  }

  await project.save();

  // Reassign any tasks owned by the removed member in this project
  // This is a business logic decision: reassign to project owner or another manager?
  // For simplicity, we'll unassign them (set to null) - frontend should handle UI for this.
  await Task.updateMany(
    { projectId: projectId, assignedTo: memberId },
    { $unset: { assignedTo: 1 } } // Or assign to project.owner: { assignedTo: project.owner }
  );


  logger.info(`User ${memberId} removed from project ${projectId} by ${req.user.id}`);
  res.status(200).json({
    success: true,
    data: {},
    message: 'Member removed and their tasks unassigned successfully',
  });
});
```