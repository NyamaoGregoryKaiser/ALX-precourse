```javascript
import React from 'react';

const JobCard = ({ job, onViewData, onRunNow, onEdit, onDelete }) => {
    return (
        <div className="bg-white shadow-md rounded-lg p-6 mb-4">
            <h3 className="text-xl font-semibold text-gray-800">{job.name}</h3>
            <p className="text-gray-600">URL: <a href={job.start_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{job.start_url}</a></p>
            <p className="text-gray-600">Type: {job.scrape_type}</p>
            <p className="text-gray-600">Status: <span className={`font-medium ${job.status === 'completed' ? 'text-green-600' : job.status === 'failed' ? 'text-red-600' : 'text-yellow-600'}`}>{job.status}</span></p>
            {job.schedule_cron && <p className="text-gray-600">Schedule: {job.schedule_cron}</p>}
            {job.last_run && <p className="text-gray-600">Last Run: {new Date(job.last_run).toLocaleString()}</p>}
            {job.next_run && <p className="text-gray-600">Next Run: {new Date(job.next_run).toLocaleString()}</p>}
            <p className="text-gray-600">Active: {job.is_active ? 'Yes' : 'No'}</p>

            <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => onViewData(job.id)} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">View Data</button>
                <button onClick={() => onRunNow(job.id)} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Run Now</button>
                <button onClick={() => onEdit(job)} className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600">Edit</button>
                <button onClick={() => onDelete(job.id)} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">Delete</button>
            </div>
        </div>
    );
};

export default JobCard;
```