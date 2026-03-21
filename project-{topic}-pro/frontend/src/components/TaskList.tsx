```typescript
import React from 'react';
import { Task } from '../types';

interface TaskListProps {
  tasks: Task[];
  onDeleteTask: (taskId: string) => void;
  userRole: string;
  currentUserId: string;
  projectOwnerId: string;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, onDeleteTask, userRole, currentUserId, projectOwnerId }) => {
  const canDeleteTask = (task: Task) => {
    return userRole === 'admin' || projectOwnerId === currentUserId;
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <h3>Tasks</h3>
      {tasks.length === 0 ? (
        <p>No tasks for this project.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {tasks.map((task) => (
            <li key={task.id} style={{ border: '1px solid #eee', padding: '15px', marginBottom: '10px', borderRadius: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: '0 0 5px' }}>{task.title}</h4>
                <p style={{ margin: '0', color: '#666' }}>Status: {task.status} | Priority: {task.priority}</p>
                <p style={{ margin: '0', color: '#666' }}>Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                <p style={{ margin: '0', color: '#666' }}>Assigned To: {task.assignedTo?.username || 'Unassigned'}</p>
              </div>
              <div>
                {canDeleteTask(task) && (
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TaskList;
```