import React, { useState, useEffect } from 'react';
import { Task, TaskPriority, TaskStatus, User } from '../../types';
import { format, parseISO } from 'date-fns';

interface TaskFormProps {
  initialData?: Task;
  projectId: string; // The project this task belongs to
  assignableUsers: User[];
  onSubmit: (data: {
    title: string;
    description?: string;
    projectId: string;
    assignedToId?: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string; // ISO string
  }) => void;
  isLoading: boolean;
  buttonText: string;
  isEditMode?: boolean;
}

const TaskForm: React.FC<TaskFormProps> = ({
  initialData,
  projectId,
  assignableUsers,
  onSubmit,
  isLoading,
  buttonText,
  isEditMode = false,
}) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [assignedToId, setAssignedToId] = useState(initialData?.assignedToId || '');
  const [status, setStatus] = useState<TaskStatus>(initialData?.status || TaskStatus.OPEN);
  const [priority, setPriority] = useState<TaskPriority>(initialData?.priority || TaskPriority.MEDIUM);
  const [dueDate, setDueDate] = useState(initialData?.dueDate ? format(parseISO(initialData.dueDate), 'yyyy-MM-dd') : '');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || '');
      setAssignedToId(initialData.assignedToId || '');
      setStatus(initialData.status);
      setPriority(initialData.priority);
      setDueDate(initialData.dueDate ? format(parseISO(initialData.dueDate), 'yyyy-MM-dd') : '');
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      title,
      description: description || undefined,
      projectId,
      assignedToId: assignedToId || undefined,
      status,
      priority,
      dueDate: dueDate || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
          required
          disabled={isLoading}
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
          disabled={isLoading}
        ></textarea>
      </div>
      <div>
        <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700">Assigned To</label>
        <select
          id="assignedTo"
          value={assignedToId}
          onChange={(e) => setAssignedToId(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
          disabled={isLoading}
        >
          <option value="">Unassigned</option>
          {assignableUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.firstName} {user.lastName} ({user.email})
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
            required
            disabled={isLoading}
          >
            {Object.values(TaskStatus).map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ').toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700">Priority</label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
            required
            disabled={isLoading}
          >
            {Object.values(TaskPriority).map((p) => (
              <option key={p} value={p}>{p.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">Due Date</label>
        <input
          type="date"
          id="dueDate"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
          disabled={isLoading}
        />
      </div>
      <button
        type="submit"
        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        disabled={isLoading}
      >
        {isLoading ? 'Processing...' : buttonText}
      </button>
    </form>
  );
};

export default TaskForm;
```

#### `frontend/src/pages/Auth/Login.tsx`
```typescript