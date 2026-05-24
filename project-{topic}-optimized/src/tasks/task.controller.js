import taskService from './task.service.js';
import catchAsync from '../utils/catchAsync.js';
import APIFeatures from '../utils/apiFeatures.js';

const createTask = catchAsync(async (req, res) => {
  const newTask = await taskService.createTask(req.params.projectId, req.body);
  res.status(201).json({
    status: 'success',
    data: {
      task: newTask,
    },
  });
});

const getAllTasks = catchAsync(async (req, res) => {
  // Can filter tasks by projectId if route is nested, or directly from query params
  let initialQuery = {};
  if (req.params.projectId) {
    initialQuery.where = { projectId: req.params.projectId };
  } else if (req.query.projectId) {
    initialQuery.where = { projectId: req.query.projectId };
  }

  const features = new APIFeatures(initialQuery, req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const tasks = await taskService.getAllTasks(features.build());
  res.status(200).json({
    status: 'success',
    results: tasks.length,
    data: {
      tasks,
    },
  });
});

const getTask = catchAsync(async (req, res) => {
  const task = await taskService.getTaskById(req.params.id);
  res.status(200).json({
    status: 'success',
    data: {
      task,
    },
  });
});

const updateTask = catchAsync(async (req, res) => {
  const updatedTask = await taskService.updateTask(req.params.id, req.body);
  res.status(200).json({
    status: 'success',
    data: {
      task: updatedTask,
    },
  });
});

const deleteTask = catchAsync(async (req, res) => {
  await taskService.deleteTask(req.params.id);
  res.status(204).send();
});


export default {
  createTask,
  getAllTasks,
  getTask,
  updateTask,
  deleteTask,
};
```

```javascript