import React from 'react';
import JobCard from './JobCard';
import './ScrapingLists.css';

function JobList({ jobs, pagination, onPageChange, onCancelJob }) {
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="job-list-container">
      <h3>My Scraping Jobs</h3>
      {jobs.length === 0 ? (
        <p>No scraping jobs found. Start a new one!</p>
      ) : (
        <>
          <div className="job-list-grid">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} onCancelJob={onCancelJob} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
              >
                Previous
              </button>
              <span>Page {pagination.currentPage} of {totalPages}</span>
              <button
                onClick={() => onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default JobList;