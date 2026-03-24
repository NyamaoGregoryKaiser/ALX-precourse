```typescript
// This component might not be strictly necessary if tasks are always viewed within a ProjectDetail.
// However, it could be used for a "My Tasks" view across all projects.
// For now, let's keep it simple and assume tasks are managed mostly within ProjectDetail.
// If you implement a global "My Tasks" view, you'd need a backend endpoint like `/users/:userId/tasks`
// or `/tasks?assigneeId=:userId` and then fetch tasks without a specific projectId.

import React from 'react';

const TaskList: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">My Tasks</h1>
      <p className="text-gray-600">
        This component would display a list of tasks assigned to the current user across all projects.
        Currently, tasks are managed within the <Link to="/projects" className="text-blue-500 hover:underline">Project Detail</Link> view.
      </p>
      {/* Implementation would involve fetching tasks assigned to the current user
          and rendering them similarly to how tasks are rendered in ProjectDetail. */}
    </div>
  );
};

export default TaskList;
```