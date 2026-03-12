// This file is crucial for defining and synchronizing all model associations
// in one place, preventing circular dependencies.

const sequelize = require('../../config/database');
const User = require('./user');
const Project = require('./project');
const Task = require('./task');

// Define Associations
// User and Project
User.hasMany(Project, { foreignKey: 'ownerId', as: 'ownedProjects' });
Project.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// User and Task (assigned tasks)
User.hasMany(Task, { foreignKey: 'assignedTo', as: 'assignedTasks' });
Task.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });

// Project and Task
Project.hasMany(Task, { foreignKey: 'projectId', as: 'tasks' });
Task.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

// User and Task (created tasks - optional, assuming task creator)
// If you want to track who created a task:
User.hasMany(Task, { foreignKey: 'creatorId', as: 'createdTasks' });
Task.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });


// Export models and sequelize instance
module.exports = {
  sequelize,
  User,
  Project,
  Task
};
```

### `backend/src/services/authService.js` (Auth Business Logic)
```javascript