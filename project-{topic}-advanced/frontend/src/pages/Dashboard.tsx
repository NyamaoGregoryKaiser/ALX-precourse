```typescript
import React, { useEffect, useState } from 'react';
import { getGlobalDashboardSummary, GlobalDashboardServiceSummary } from '../api/dashboard';
import ServiceCard from '../components/ServiceCard';

const Dashboard: React.FC = () => {
  const [servicesSummary, setServicesSummary] = useState<GlobalDashboardServiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const data = await getGlobalDashboardSummary();
        setServicesSummary(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch dashboard summary.');
        console.error('Error fetching dashboard summary:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) {
    return <div className="container mx-auto p-6 text-center">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-6 text-red-500 text-center">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">My Services Dashboard</h1>

      {servicesSummary.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-gray-600 text-lg mb-4">You haven't added any services yet.</p>
          <p className="text-gray-500">Go to the <a href="/services" className="text-blue-600 hover:underline">Services page</a> to add your first service!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicesSummary.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
```