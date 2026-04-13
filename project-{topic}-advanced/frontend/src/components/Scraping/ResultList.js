import React from 'react';
import ResultCard from './ResultCard';
import './ScrapingLists.css';

function ResultList({ results, pagination, onPageChange, onDeleteResult }) {
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="result-list-container">
      <h3>My Scraped Results</h3>
      {results.length === 0 ? (
        <p>No scraped results found.</p>
      ) : (
        <>
          <div className="result-list-grid">
            {results.map((result) => (
              <ResultCard key={result.id} result={result} onDeleteResult={onDeleteResult} />
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

export default ResultList;