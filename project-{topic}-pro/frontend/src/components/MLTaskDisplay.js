import React from 'react';
import Card from './Card';

const MLTaskDisplay = ({ task }) => {
  return (
    <Card className="mb-4">
      <h4 className="text-lg font-semibold text-gray-800 mb-2">Task: {task.type.replace(/_/g, ' ')}</h4>
      <p className="text-sm text-gray-600 mb-1">Status: <span className={`font-medium ${task.status === 'completed' ? 'text-green-600' : 'text-red-600'}`}>{task.status}</span></p>
      <p className="text-sm text-gray-600 mb-1">Created At: {new Date(task.createdAt).toLocaleString()}</p>

      <div className="mt-4">
        <h5 className="text-md font-medium text-gray-700">Input Data:</h5>
        <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-40">
          {JSON.stringify(task.inputData, null, 2)}
        </pre>
      </div>

      {task.parameters && Object.keys(task.parameters).length > 0 && (
        <div className="mt-4">
          <h5 className="text-md font-medium text-gray-700">Parameters:</h5>
          <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-40">
            {JSON.stringify(task.parameters, null, 2)}
          </pre>
        </div>
      )}

      {task.outputData && (
        <div className="mt-4">
          <h5 className="text-md font-medium text-gray-700">Output Data:</h5>
          <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-40">
            {JSON.stringify(task.outputData, null, 2)}
          </pre>
        </div>
      )}
    </Card>
  );
};

export default MLTaskDisplay;