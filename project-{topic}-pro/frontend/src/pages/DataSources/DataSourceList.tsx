```typescript
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataSource } from '../../types';
import axiosInstance from '../../api/axiosInstance';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

const DataSourceList: React.FC = () => {
    useAuthRedirect();

    const [dataSources, setDataSources] = useState<DataSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDataSources = async () => {
            try {
                setLoading(true);
                const response = await axiosInstance.get('/data-sources');
                setDataSources(response.data);
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to fetch data sources.');
            } finally {
                setLoading(false);
            }
        };
        fetchDataSources();
    }, []);

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this data source? Any charts relying on it will stop working.')) {
            try {
                await axiosInstance.delete(`/data-sources/${id}`);
                setDataSources(dataSources.filter((ds) => ds.id !== id));
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to delete data source. It might be in use by charts.');
            }
        }
    };

    if (loading) return <div className="p-4 text-center">Loading data sources...</div>;
    if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Your Data Sources</h2>
            <div className="flex justify-end mb-4">
                <Link to="/data-sources/new" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    Add New Data Source
                </Link>
            </div>
            {dataSources.length === 0 ? (
                <p className="text-gray-600">You haven't added any data sources yet. Connect your first database!</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dataSources.map((dataSource) => (
                        <div key={dataSource.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow duration-200">
                            <h3 className="text-xl font-semibold mb-2 text-gray-900">{dataSource.name}</h3>
                            <p className="text-gray-700 mb-4">Type: <span className="font-medium">{dataSource.type.toUpperCase()}</span></p>
                            <p className="text-gray-700 mb-4">Host: <span className="font-medium">{dataSource.connectionDetails.host || 'N/A'}</span></p>

                            <div className="flex justify-between items-center mt-4">
                                <Link to={`/data-sources/${dataSource.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                                    View Details
                                </Link>
                                <div>
                                    <button
                                        onClick={() => navigate(`/data-sources/${dataSource.id}/edit`)}
                                        className="text-yellow-600 hover:text-yellow-800 font-medium mr-4"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(dataSource.id)}
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

export default DataSourceList;
```