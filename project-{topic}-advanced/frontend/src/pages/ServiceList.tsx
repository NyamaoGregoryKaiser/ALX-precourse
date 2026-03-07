```typescript
import React, { useEffect, useState } from 'react';
import { getServices, Service, createService, deleteService, regenerateApiKey } from '../api/services';
import { Link } from 'react-router-dom';

const ServiceList: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDescription, setNewServiceDescription] = useState('');
  const [addServiceLoading, setAddServiceLoading] = useState(false);
  const [addServiceError, setAddServiceError] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await getServices();
      setServices(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch services.');
      console.error('Error fetching services:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddServiceLoading(true);
    setAddServiceError(null);
    try {
      const response = await createService({ name: newServiceName, description: newServiceDescription });
      setServices((prev) => [...prev, response.data]);
      setNewServiceName('');
      setNewServiceDescription('');
      setShowAddForm(false);
    } catch (err: any) {
      setAddServiceError(err.response?.data?.message || 'Failed to add service.');
      console.error('Error adding service:', err);
    } finally {
      setAddServiceLoading(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this service? All associated metrics and data points will also be deleted.')) {
      try {
        await deleteService(id);
        setServices((prev) => prev.filter((s) => s.id !== id));
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to delete service.');
        console.error('Error deleting service:', err);
      }
    }
  };

  const handleRegenerateApiKey = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to regenerate the API key for "${name}"? The old key will no longer work.`)) {
      try {
        const response = await regenerateApiKey(id);
        alert(`New API Key for ${name}: ${response.data.apiKey}\n\nPlease save this key as it will not be shown again.`);
        fetchServices(); // Refresh to reflect any changes if needed, though API key is not displayed directly
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to regenerate API key.');
        console.error('Error regenerating API key:', err);
      }
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6 text-center">Loading services...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-6 text-red-500 text-center">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">My Monitored Services</h1>

      <button
        onClick={() => setShowAddForm(!showAddForm)}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-6 transition duration-200"
      >
        {showAddForm ? 'Cancel Add Service' : 'Add New Service'}
      </button>

      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New Service</h2>
          {addServiceError && <p className="text-red-500 mb-4">{addServiceError}</p>}
          <form onSubmit={handleAddService} className="space-y-4">
            <div>
              <label htmlFor="serviceName" className="block text-gray-700 font-bold mb-2">Service Name:</label>
              <input
                type="text"
                id="serviceName"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                className="shadow border rounded w-full py-2 px-3 text-gray-700"
                required
              />
            </div>
            <div>
              <label htmlFor="serviceDescription" className="block text-gray-700 font-bold mb-2">Description (Optional):</label>
              <textarea
                id="serviceDescription"
                value={newServiceDescription}
                onChange={(e) => setNewServiceDescription(e.target.value)}
                className="shadow border rounded w-full py-2 px-3 text-gray-700"
                rows={3}
              />
            </div>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-200"
              disabled={addServiceLoading}
            >
              {addServiceLoading ? 'Adding...' : 'Create Service'}
            </button>
          </form>
        </div>
      )}

      {services.length === 0 ? (
        <p className="text-gray-600 text-lg">No services registered yet. Add one above!</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          <table className="min-w-full leading-normal">
            <thead>
              <tr>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id}>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <Link to={`/services/${service.id}`} className="text-blue-600 hover:underline font-medium">
                      {service.name}
                    </Link>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    {service.description || 'N/A'}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    {new Date(service.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm space-x-2">
                    <button
                      onClick={() => handleRegenerateApiKey(service.id, service.name)}
                      className="text-yellow-600 hover:text-yellow-800 text-sm"
                      title="Regenerate API Key"
                    >
                      Regenerate Key
                    </button>
                    <Link to={`/services/${service.id}/metrics`} className="text-purple-600 hover:text-purple-800 text-sm">
                      Metrics
                    </Link>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                      title="Delete Service"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ServiceList;
```