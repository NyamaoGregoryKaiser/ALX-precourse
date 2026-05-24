import projectService from './project.service.js';
import catchAsync from '../utils/catchAsync.js';
import APIFeatures from '../utils/apiFeatures.js';

const createProject = catchAsync(async (req, res) => {
  const newProject = await projectService.createProject(req.body, req.user.id);
  res.status(201).json({
    status: 'success',
    data: {
      project: newProject,
    },
  });
});

const getAllProjects = catchAsync(async (req, res) => {
  // Potentially filter projects a user has access to (e.g., owned, or part of their team)
  let initialQuery = {};
  if (req.user.role === 'USER') { // Basic users only see projects they own or are part of their teams
    // This requires a more complex query for users to fetch projects they are part of a team for
    // For simplicity, let's assume `ownerId` filter for now, or allow all to be filtered by client
    // A more robust solution would involve a join on TeamMember
    initialQuery = {
      OR: [
        { ownerId: req.user.id },
        { team: { members: { some: { userId: req.user.id } } } }
      ]
    };
  }

  const features = new APIFeatures(initialQuery, req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const projects = await projectService.getAllProjects(features.build());
  res.status(200).json({
    status: 'success',
    results: projects.length,
    data: {
      projects,
    },
  });
});

const getProject = catchAsync(async (req, res) => {
  const project = await projectService.getProjectById(req.params.id);
  res.status(200).json({
    status: 'success',
    data: {
      project,
    },
  });
});

const updateProject = catchAsync(async (req, res) => {
  const updatedProject = await projectService.updateProject(req.params.id, req.body);
  res.status(200).json({
    status: 'success',
    data: {
      project: updatedProject,
    },
  });
});

const deleteProject = catchAsync(async (req, res) => {
  await projectService.deleteProject(req.params.id);
  res.status(204).send();
});


export default {
  createProject,
  getAllProjects,
  getProject,
  updateProject,
  deleteProject,
};
```

```javascript