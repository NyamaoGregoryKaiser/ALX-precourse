import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './JobDetail.css';

const JobDetail = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [job, setJob] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }

    if (isAuthenticated) {
      fetchJobDetails();
      fetchJobItems();
    }
  }, [isAuthenticated, authLoading, navigate, jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/jobs/${jobId}`);
      setJob(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch job details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobItems = async () => {
    try {
      const response = await api.get(`/jobs/${jobId}/items`);
      setItems(response.data);
    } catch (err) {
      console.error('Failed to fetch scraped items for job:', err);
    }
  };

  if (authLoading || loading) {
    return <div className="loading-spinner">Loading job details...</div>;
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  if (!job) {
    return <div className="not-found-message">Job not found.</div>;
  }

  return (
    <div className="job-detail-container">
      <div className="header">
        <h1>Scrape Job: {job.id.substring(0, 8)}...</h1>
        <div className="actions">
          <Link to={`/scrapers/${job.scraper_id}`} className="button back-to-scraper-button">Back to Scraper</Link>
          <Link to="/dashboard" className="button back-button">Back to Dashboard</Link>
        </div>
      </div>

      <div className="job-info-card">
        <p><strong>Status:</strong> <span className={`status-tag ${job.status}`}>{job.status}</span></p>
        <p><strong>Started:</strong> {new Date(job.start_time).toLocaleString()}</p>
        {job.end_time && <p><strong>Ended:</strong> {new Date(job.end_time).toLocaleString()}</p>}
        <p><strong>Items Scraped:</strong> {job.items_scraped}</p>
        {job.error_message && <p className="job-error"><strong>Error:</strong> {job.error_message}</p>}
      </div>

      <h2>Scraped Items ({items.length})</h2>
      {items.length === 0 ? (
        <p>No items were scraped during this job, or the job is still running/failed.</p>
      ) : (
        <div className="item-list">
          {items.map((item) => (
            <div key={item.id} className="item-card">
              <p><strong>Scraped At:</strong> {new Date(item.scraped_at).toLocaleString()}</p>
              <p><strong>URL:</strong> <a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a></p>
              <h4>Data:</h4>
              <pre className="code-block">{JSON.stringify(item.data, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobDetail;