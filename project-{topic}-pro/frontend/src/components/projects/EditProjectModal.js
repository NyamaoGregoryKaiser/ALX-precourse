```javascript
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

function EditProjectModal({ project, onUpdate, onCancel }) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [startDate, setStartDate] = useState(project.startDate ? format(new Date(project.startDate), 'yyyy-MM-dd') : '');
  const [endDate, setEndDate] = useState(project.endDate ? format(new Date(project.endDate), 'yyyy-MM-dd') : '');
  const [status, setStatus] = useState(project.status);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Update state if project prop changes (e.g., if re-opening modal for different project)
    setName(project.name);
    setDescription(project.description);
    setStartDate(project.startDate ? format(new Date(project.startDate), 'yyyy-MM-dd') : '');
    setEndDate(project.endDate ? format(new Date(project.endDate), 'yyyy-MM-dd') : '');
    setStatus(project.status);
    setError(''); // Clear error on project change
  }, [project]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const updateData = {
        name,
        description,
        status,
      };
      if (startDate) updateData.startDate = startDate;
      if (endDate) updateData.endDate = endDate;

      await onUpdate(project._id, updateData);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Project Name</label>
        <input
          type="text"
          id="name"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          id="description"
          rows="3"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        ></textarea>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
          <input
            type="date"
            id="startDate"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date</label>
          <input
            type="date"
            id="endDate"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
        <select
          id="status"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="active">Active</option>
          <option value="on-hold">On-Hold</option>
          <option value="archived">Archived</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Updating...' : 'Update Project'}
        </button>
      </div>
    </form>
  );
}

export default EditProjectModal;
```