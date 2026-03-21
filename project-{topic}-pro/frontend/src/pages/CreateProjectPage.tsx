```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/api';
import { Project } from '../types';
import { useAuth } from '../contexts/AuthContext';

const CreateProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<Project['status']>('planned');

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const projectData = {
      name,
      description,
      startDate,
      endDate,
      status,
    };

    try {
      await projectService.createProject(projectData);
      alert('Project created successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Failed to create project:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to create project. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return <p style={{ textAlign: 'center' }}>Loading...</p>;
  }

  return (
    <div style={{ maxWidth: '600px', margin: '20px auto', padding: '25px', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
      <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '20px', padding: '8px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Back to Dashboard</button>

      <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '30px' }}>Create New Project</h1>

      {error && <p style={{ color: 'red', textAlign: 'center', marginBottom: '15px' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
        <div>
          <label htmlFor="name" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Project Name:</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label htmlFor="description" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Description:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={5}
            style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
          ></textarea>
        </div>
        <div>
          <label htmlFor="startDate" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Start Date:</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label htmlFor="endDate" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>End Date:</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label htmlFor="status" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Status:</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as Project['status'])}
            style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
          >
            <option value="planned">Planned</option>
            <option value="in-progress">In-Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '1.1em',
            marginTop: '10px'
          }}
        >
          {loading ? 'Creating...' : 'Create Project'}
        </button>
      </form>
    </div>
  );
};

export default CreateProjectPage;
```