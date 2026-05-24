import teamService from './team.service.js';
import catchAsync from '../utils/catchAsync.js';
import APIFeatures from '../utils/apiFeatures.js';

const createTeam = catchAsync(async (req, res) => {
  const newTeam = await teamService.createTeam(req.body, req.user.id);
  res.status(201).json({
    status: 'success',
    data: {
      team: newTeam,
    },
  });
});

const getAllTeams = catchAsync(async (req, res) => {
  const features = new APIFeatures({}, req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const teams = await teamService.getAllTeams(features.build());
  res.status(200).json({
    status: 'success',
    results: teams.length,
    data: {
      teams,
    },
  });
});

const getTeam = catchAsync(async (req, res) => {
  const team = await teamService.getTeamById(req.params.id);
  res.status(200).json({
    status: 'success',
    data: {
      team,
    },
  });
});

const updateTeam = catchAsync(async (req, res) => {
  const updatedTeam = await teamService.updateTeam(req.params.id, req.body);
  res.status(200).json({
    status: 'success',
    data: {
      team: updatedTeam,
    },
  });
});

const deleteTeam = catchAsync(async (req, res) => {
  await teamService.deleteTeam(req.params.id);
  res.status(204).send();
});

const addMember = catchAsync(async (req, res) => {
  const { userId, role } = req.body;
  const newMember = await teamService.addTeamMember(req.params.id, userId, role);
  res.status(201).json({
    status: 'success',
    message: 'Member added to team successfully.',
    data: {
      member: newMember,
    },
  });
});

const removeMember = catchAsync(async (req, res) => {
  const { userId } = req.body; // Expect userId in body
  await teamService.removeTeamMember(req.params.id, userId);
  res.status(204).send();
});

const updateMemberRole = catchAsync(async (req, res) => {
  const { userId, role } = req.body;
  const updatedMember = await teamService.updateTeamMemberRole(req.params.id, userId, role);
  res.status(200).json({
    status: 'success',
    message: 'Team member role updated successfully.',
    data: {
      member: updatedMember,
    },
  });
});


export default {
  createTeam,
  getAllTeams,
  getTeam,
  updateTeam,
  deleteTeam,
  addMember,
  removeMember,
  updateMemberRole,
};
```

```javascript