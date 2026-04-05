```typescript
import React from 'react';
import { Link } from 'react-router-dom';
import moment from 'moment';

interface MonitorCardProps {
  monitor: {
    id: string;
    name: string;
    url: string;
    status: 'active' | 'paused';
    intervalSeconds: number;
    lastCheckAt?: string;
  };
  onDelete: (monitorId: string) => void;
  onPauseToggle: (monitorId: string, currentStatus: 'active' | 'paused') => void;
}

const MonitorCard: React.FC<MonitorCardProps> = ({ monitor, onDelete, onPauseToggle }) => {
  const lastCheckDisplay = monitor.lastCheckAt
    ? moment(monitor.lastCheckAt).fromNow()
    : 'Never';

  const statusColor = monitor.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';

  return (
    <div className="bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition-shadow duration-200 flex flex-col justify-between">
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">{monitor.name}</h3>
        <p className="text-gray-600 text-sm break-all mb-3">{monitor.url}</p>
        <div className="flex items-center mb-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
            {monitor.status.toUpperCase()}
          </span>
          <span className="ml-3 text-sm text-gray-500">
            Checks every {monitor.intervalSeconds}s
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-4">Last checked: {lastCheckDisplay}</p>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        <Link
          to={`/monitors/${monitor.id}`}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors duration-200"
        >
          View Details
        </Link>
        <button
          onClick={() => onPauseToggle(monitor.id, monitor.status)}
          className={`py-2 px-3 text-sm font-medium rounded-md transition-colors duration-200 ${
            monitor.status === 'active'
              ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {monitor.status === 'active' ? 'Pause' : 'Activate'}
        </button>
        <button
          onClick={() => onDelete(monitor.id)}
          className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors duration-200"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default MonitorCard;
```