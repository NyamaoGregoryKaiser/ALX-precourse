```typescript
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Dashboard } from '../../types';
import axiosInstance from '../../api/axiosInstance';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

const DashboardList: React.FC = () => {
    useAuthRedirect(); // Redirect to login if not authenticated

    const [dashboards, setDashboards] = useState<Dashboard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDashboards = async () => {
            try {
                setLoading(true);
                const response = await axiosInstance.get('/dashboards');
                setDashboards(response.data);
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to fetch dashboards.');
            } finally {
                setLoading(false);
            }
        };
        fetchDashboards();
    }, []);

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this dashboard? This will also delete all charts within it.')) {
            try {
                await axiosInstance.delete(`/dashboards/${id}`);
                setDashboards(dashboards.filter((d) => d.id !== id));
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to delete dashboard.');
            }
        }
    };

    if (loading) return <div className="p-4 text-center">Loading dashboards...</div>;
    if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Your Dashboards</h2>
            <div className="flex justify-end mb-4">
                <Link to="/dashboards/new" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    Create New Dashboard
                </Link>
            </div>
            {dashboards.length === 0 ? (
                <p className="text-gray-600">You haven't created any dashboards yet. Start by creating one!</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dashboards.map((dashboard) => (
                        <div key={dashboard.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow duration-200">
                            <h3 className="text-xl font-semibold mb-2 text-gray-900">{dashboard.name}</h3>
                            <p className="text-gray-700 mb-4 h-16 overflow-hidden">{dashboard.description || 'No description provided.'}</p>
                            <div className="flex justify-between items-center mt-4">
                                <Link to={`/dashboards/${dashboard.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                                    View Dashboard
                                </Link>
                                <div>
                                    <button
                                        onClick={() => navigate(`/dashboards/${dashboard.id}/edit`)}
                                        className="text-yellow-600 hover:text-yellow-800 font-medium mr-4"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(dashboard.id)}
                                        className="text-red-600 hover:text-red-800 font-medium"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DashboardList;
```