```typescript
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { Dashboard } from '../../types';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

const DashboardForm: React.FC = () => {
    useAuthRedirect();

    const { id } = useParams<{ id: string }>(); // Will be present if editing
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEditing = !!id;

    useEffect(() => {
        if (isEditing) {
            const fetchDashboard = async () => {
                try {
                    setLoading(true);
                    const response = await axiosInstance.get(`/dashboards/${id}`);
                    const dashboard: Dashboard = response.data;
                    setName(dashboard.name);
                    setDescription(dashboard.description);
                } catch (err: any) {
                    setError(err.response?.data?.message || 'Failed to fetch dashboard for editing.');
                } finally {
                    setLoading(false);
                }
            };
            fetchDashboard();
        }
    }, [id, isEditing]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const payload = { name, description };
            if (isEditing) {
                await axiosInstance.put(`/dashboards/${id}`, payload);
            } else {
                await axiosInstance.post('/dashboards', payload);
            }
            navigate('/dashboards');
        } catch (err: any) {
            console.error('Dashboard save error:', err);
            setError(err.response?.data?.message || 'Failed to save dashboard.');
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEditing) return <div className="p-4 text-center">Loading dashboard data...</div>;
    if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

    return (
        <div className="container mx-auto p-4 max-w-lg bg-white rounded-lg shadow-md mt-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">{isEditing ? 'Edit Dashboard' : 'Create New Dashboard'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Dashboard Name</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    ></textarea>
                </div>
                <div className="flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboards')}
                        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : (isEditing ? 'Update Dashboard' : 'Create Dashboard')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DashboardForm;
```