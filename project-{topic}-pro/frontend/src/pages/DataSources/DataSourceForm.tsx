```typescript
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { DataSource, DataSourceType } from '../../types';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

const DataSourceForm: React.FC = () => {
    useAuthRedirect();

    const { id } = useParams<{ id: string }>(); // Will be present if editing
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [type, setType] = useState<DataSourceType>(DataSourceType.POSTGRES);
    const [connectionDetails, setConnectionDetails] = useState<string>('{}'); // JSON string
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEditing = !!id;

    useEffect(() => {
        if (isEditing) {
            const fetchDataSource = async () => {
                try {
                    setLoading(true);
                    const response = await axiosInstance.get(`/data-sources/${id}`);
                    const dataSource: DataSource = response.data;
                    setName(dataSource.name);
                    setType(dataSource.type);
                    setConnectionDetails(JSON.stringify(dataSource.connectionDetails, null, 2));
                } catch (err: any) {
                    setError(err.response?.data?.message || 'Failed to fetch data source for editing.');
                } finally {
                    setLoading(false);
                }
            };
            fetchDataSource();
        }
    }, [id, isEditing]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const parsedConnectionDetails = JSON.parse(connectionDetails);
            const payload = { name, type, connectionDetails: parsedConnectionDetails };

            if (isEditing) {
                await axiosInstance.put(`/data-sources/${id}`, payload);
            } else {
                await axiosInstance.post('/data-sources', payload);
            }
            navigate('/data-sources');
        } catch (err: any) {
            console.error('Data source save error:', err);
            setError(err.response?.data?.message || 'Failed to save data source. Please check your inputs, especially the JSON format.');
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEditing) return <div className="p-4 text-center">Loading data source data...</div>;
    if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

    return (
        <div className="container mx-auto p-4 max-w-lg bg-white rounded-lg shadow-md mt-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">{isEditing ? 'Edit Data Source' : 'Add New Data Source'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Source Name</label>
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
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700">Source Type</label>
                    <select
                        id="type"
                        value={type}
                        onChange={(e) => setType(e.target.value as DataSourceType)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        required
                    >
                        {Object.values(DataSourceType).map(dsType => (
                            <option key={dsType} value={dsType}>{dsType.toUpperCase()}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="connectionDetails" className="block text-sm font-medium text-gray-700">Connection Details (JSON)</label>
                    <textarea
                        id="connectionDetails"
                        value={connectionDetails}
                        onChange={(e) => setConnectionDetails(e.target.value)}
                        rows={8}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 font-mono"
                        placeholder={`{\n  "host": "localhost",\n  "port": 5432,\n  "username": "dbuser",\n  "password": "dbpassword",\n  "database": "mydatabase"\n}`}
                        required
                    ></textarea>
                    <p className="text-xs text-gray-500 mt-1">Provide connection details as a JSON object. Ensure it's valid JSON.</p>
                </div>
                <div className="flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/data-sources')}
                        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : (isEditing ? 'Update Data Source' : 'Add Data Source')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DataSourceForm;
```