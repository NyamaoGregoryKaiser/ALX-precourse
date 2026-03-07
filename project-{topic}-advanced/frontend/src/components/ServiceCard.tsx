```typescript
import React from 'react';
import { Link } from 'react-router-dom';
import { GlobalDashboardServiceSummary } from '../api/dashboard';

interface ServiceCardProps {
  service: GlobalDashboardServiceSummary;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 flex flex-col justify-between hover:shadow-lg transition-shadow duration-200">
      <div>
        <h3 className="text-xl font-semibold mb-2 text-blue-700">{service.name}</h3>
        <p className="text-gray-600 mb-4 text-sm">{service.description || 'No description provided.'}</p>
        <div className="text-sm text-gray-700">
          <p><strong>Metrics Defined:</strong> {service.metricCount}</p>
          <p><strong>Created:</strong> {new Date(service.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="mt-4">
          <h4 className="font-medium text-gray-800">Latest Metrics:</h4>
          {service.metricsSummary.length > 0 ? (
            <ul className="list-disc list-inside text-sm text-gray-600">
              {service.metricsSummary.slice(0, 3).map((metric, index) => (
                <li key={index}>
                  {metric.metricName}: {metric.latestValue !== null ? `${metric.latestValue.toFixed(2)} ${metric.unit || ''}` : 'N/A'}
                </li>
              ))}
              {service.metricsSummary.length > 3 && (
                <li>... {service.metricsSummary.length - 3} more</li>
              )}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No metrics yet.</p>
          )}
        </div>
      </div>
      <Link
        to={`/services/${service.id}`}
        className="mt-6 inline-block bg-blue-500 hover:bg-blue-600 text-white text-center py-2 px-4 rounded transition duration-200"
      >
        View Details
      </Link>
    </div>
  );
};

export default ServiceCard;
```