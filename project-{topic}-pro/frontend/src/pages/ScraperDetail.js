import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './ScraperDetail.css';

const ScraperDetail = () => {
  const { scraperId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [scraper, setScraper] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'jobs', 'items'

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }

    if (isAuthenticated) {
      fetchScraperDetails();
      fetchScraperJobs();
      fetchScraperItems();
    }
  }, [isAuthenticated, authLoading, navigate, scraperId]);

  const fetchScraperDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/scrapers/${scraperId}`);
      setScraper(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch scraper details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchScraperJobs = async () => {
    try {
      const response = await api.get(`/scrapers/${scraperId}/jobs`);
      setJobs(response.data.jobs);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    }
  };

  const fetchScraperItems = async () => {
    try {
      const response = await api.get(`/scrapers/${scraperId}/items`);
      setItems(response.data.items);
    } catch (err) {
      console.error('Failed to fetch scraped items:', err);
    }
  };

  const handleTriggerScrape = async () => {
    if (window.confirm(`Trigger a manual scrape for "${scraper.name}"?`)) {
      try {
        const response = await api.post(`/scrapers/${scraperId}/trigger`);
        alert(`Scrape job queued: ${response.data.jobId}`);
        fetchScraperJobs(); // Refresh jobs list
      } catch (err) {
        alert(`Failed to trigger scrape: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  if (authLoading || loading) {
    return <div className="loading-spinner">Loading scraper details...</div>;
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  if (!scraper) {
    return <div className="not-found-message">Scraper not found.</div>;
  }

  return (
    <div className="scraper-detail-container">
      <div className="header">
        <h1>{scraper.name}</h1>
        <div className="actions">
          <button onClick={handleTriggerScrape} className="button trigger-scrape-button">Trigger Scrape</button>
          <Link to={`/scrapers/${scraper.id}/edit`} className="button edit-scraper-button">Edit Scraper</Link>
          <Link to="/dashboard" className="button back-button">Back to Dashboard</Link>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        <button
          className={`tab-button ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          Jobs ({jobs.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          Scraped Items ({items.length})
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'details' && (
          <div className="details-section">
            <p><strong>Description:</strong> {scraper.description || 'N/A'}</p>
            <p><strong>Start URL:</strong> <a href={scraper.start_url} target="_blank" rel="noopener noreferrer">{scraper.start_url}</a></p>
            <p><strong>Method:</strong> {scraper.scraping_method}</p>
            <p><strong>Active:</strong> {scraper.is_active ? 'Yes' : 'No'}</p>
            <p><strong>Schedule (Cron):</strong> {scraper.schedule_cron || 'N/A'}</p>
            <p><strong>Last Run:</strong> {scraper.last_run ? new Date(scraper.last_run).toLocaleString() : 'Never'}</p>
            <p><strong>Created At:</strong> {new Date(scraper.created_at).toLocaleString()}</p>
            <p><strong>Updated At:</strong> {new Date(scraper.updated_at).toLocaleString()}</p>
            <h4>Selectors:</h4>
            <pre className="code-block">{JSON.stringify(JSON.parse(scraper.selectors_json), null, 2)}</pre>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="jobs-section">
            {jobs.length === 0 ? (
              <p>No scrape jobs found for this scraper.</p>
            ) : (
              <div className="job-list">
                {jobs.map((job) => (
                  <div key={job.id} className={`job-card status-${job.status}`}>
                    <p><strong>Job ID:</strong> {job.id.substring(0, 8)}...</p>
                    <p><strong>Status:</strong> <span className={`status-tag ${job.status}`}>{job.status}</span></p>
                    <p><strong>Started:</strong> {new Date(job.start_time).toLocaleString()}</p>
                    {job.end_time && <p><strong>Ended:</strong> {new Date(job.end_time).toLocaleString()}</p>}
                    <p><strong>Items Scraped:</strong> {job.items_scraped}</p>
                    {job.error_message && <p className="job-error"><strong>Error:</strong> {job.error_message}</p>}
                    <Link to={`/jobs/${job.id}`} className="button view-job-items">View Job Items</Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'items' && (
          <div className="items-section">
            {items.length === 0 ? (
              <p>No scraped items found for this scraper.</p>
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
        )}
      </div>
    </div>
  );
};

export default ScraperDetail;