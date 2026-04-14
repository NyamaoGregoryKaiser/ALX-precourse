import React from 'react';
import TaskList from '../components/Tasks/TaskList';

const TaskPage: React.FC = () => {
  return (
    <div className="task-page">
      <TaskList />
    </div>
  );
};

export default TaskPage;