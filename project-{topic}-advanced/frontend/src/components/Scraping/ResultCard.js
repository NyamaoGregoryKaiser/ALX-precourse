import React, { useState } from 'react';
import './ScrapingCards.css';

function ResultCard({ result, onDeleteResult }) {
  const [showFullData, setShowFullData] = useState(false);

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const renderData = (data) => {
    // Attempt to pretty print JSON data
    try {
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return String(data); // Fallback for non-JSON or complex objects
    }
  };

  const dataPreview = renderData(result.data).substring(0, 200) + (renderData(result.data).length > 200 ? '...' : '');

  return (
    <div className="result-card">
      <h3>Result ID: {result.id.substring(0, 8)}...</h3>
      <p><strong>Job ID:</strong> {result.job?.id.substring(0, 8)}... (URL: <a href={result.job?.url} target="_blank" rel="noopener noreferrer">{result.job?.url}</a>)</p>
      <p><strong>Extracted At:</strong> {formatDateTime(result.extractedAt)}</p>
      <div className="result-data-section">
        <strong>Data:</strong>
        <pre className="result-data-code">
          {showFullData ? renderData(result.data) : dataPreview}
        </pre>
        {renderData(result.data).length > 200 && (
          <button onClick={() => setShowFullData(!showFullData)} className="toggle-data-button">
            {showFullData ? 'Show Less' : 'Show More'}
          </button>
        )}
      </div>
      <button className="delete-button" onClick={() => onDeleteResult(result.id)}>Delete Result</button>
    </div>
  );
}

export default ResultCard;