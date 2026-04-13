import React from 'react';
import './ScrapingCards.css';

function JobCard({ job, onCancelJob }) {
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'COMPLETED': return 'status-completed';
      case 'RUNNING': return 'status-running';
      case 'PENDING': return 'status-pending';
      case 'FAILED': return 'status-failed';
      case 'CANCELLED': return 'status-cancelled';
      default: return '';
    }
  };

  return (
    <div className="job-card">
      <h3>Job ID: {job.id.substring(0, 8)}...</h3>
      <p><strong>URL:</strong> <a href={job.url} target="_blank" rel="noopener noreferrer">{job.url}</a></p>
      <p><strong>Status:</strong> <span className={`job-status ${getStatusClass(job.status)}`}>{job.status}</span></p>
      <p><strong>Created:</strong> {formatDateTime(job.createdAt)}</p>
      <p><strong>Started:</strong> {formatDateTime(job.startTime)}</p>
      <p><strong>Ended:</strong> {formatDateTime(job.endTime)}</p>
      {job.errorMessage && <p className="error-message"><strong>Error:</strong> {job.errorMessage}</p>}
      {job.targetElements && (
        <div className="target-elements-preview">
          <strong>Elements:</strong>
          <ul>
            {job.targetElements.map((el, index) => (
              <li key={index}>{el.name} ({el.selector})</li>
            ))}
          </ul>
        </div>
      )}
      {(job.status === 'PENDING' || job.status === 'RUNNING') && (
        <button className="cancel-button" onClick={() => onCancelJob(job.id)}>Cancel Job</button>
      )}
    </div>
  );
}

export default JobCard;