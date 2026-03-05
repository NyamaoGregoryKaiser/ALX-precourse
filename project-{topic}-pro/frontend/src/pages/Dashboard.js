import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [scrapers, setScrapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newScraperForm, setNewScraperForm] = useState({
    name: '',
    description: '',
    start_url: '',
    selectors_json: '{\n  "item": "div.item",\n  "fields": {\n    "title": "h2.title",\n    "url": { "selector": "a", "attr": "href" }\n  }\n}',
    schedule_cron: '',
    is_active: true,
    scraping_method: 'cheerio',
  });
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }

    if (isAuthenticated) {
      fetchScrapers();
    }
  }, [isAuthenticated, authLoading, navigate]);

  const fetchScrapers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/scrapers');
      setScrapers(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch scrapers.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewScraperForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCreateScraper = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.post('/scrapers', newScraperForm);
      setShowForm(false);
      setNewScraperForm({
        name: '',
        description: '',
        start_url: '',
        selectors_json: '{\n  "item": "div.item",\n  "fields": {\n    "title": "h2.title",\n    "url": { "selector": "a", "attr": "href" }\n  }\n}',
        schedule_cron: '',
        is_active: true,
        scraping_method: 'cheerio',
      });
      fetchScrapers(); // Refresh list
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to create scraper.');
    }
  };

  const handleDeleteScraper = async (id) => {
    if (window.confirm('Are you sure you want to delete this scraper?')) {
      try {
        await api.delete(`/scrapers/${id}`);
        fetchScrapers(); // Refresh list
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to delete scraper.');
      }
    }
  };

  const handleTriggerScrape = async (id, name) => {
    if (window.confirm(`Trigger a manual scrape for "${name}"?`)) {
      try {
        const response = await api.post(`/scrapers/${id}/trigger`);
        alert(`Scrape job queued: ${response.data.jobId}`);
      } catch (err) {
        alert(`Failed to trigger scrape: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  if (authLoading || loading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  return (
    <div className="dashboard-container">
      <h1>Welcome, {user?.username}!</h1>
      <h2>Your Scrapers</h2>

      <button onClick={() => setShowForm(!showForm)} className="create-scraper-toggle-button">
        {showForm ? 'Hide Form' : 'Create New Scraper'}
      </button>

      {showForm && (
        <div className="create-scraper-form-container">
          <h3>Create New Scraper</h3>
          {formError && <p className="error-message">{formError}</p>}
          <form onSubmit={handleCreateScraper} className="create-scraper-form">
            <div className="form-group">
              <label htmlFor="name">Name:</label>
              <input type="text" id="name" name="name" value={newScraperForm.name} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="description">Description:</label>
              <textarea id="description" name="description" value={newScraperForm.description} onChange={handleInputChange}></textarea>
            </div>
            <div className="form-group">
              <label htmlFor="start_url">Start URL:</label>
              <input type="url" id="start_url" name="start_url" value={newScraperForm.start_url} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="selectors_json">Selectors (JSON):</label>
              <textarea
                id="selectors_json"
                name="selectors_json"
                value={newScraperForm.selectors_json}
                onChange={handleInputChange}
                rows="10"
                cols="50"
                required
              ></textarea>
              <small>Example: `{"item": "div.post", "fields": {"title": "h2", "link": {"selector": "a", "attr": "href"}}}`</small>
            </div>
            <div className="form-group">
              <label htmlFor="schedule_cron">Schedule (Cron):</label>
              <input type="text" id="schedule_cron" name="schedule_cron" value={newScraperForm.schedule_cron} onChange={handleInputChange} placeholder="e.g., 0 */4 * * *" />
              <small>Leave empty for manual triggering. Example for every 4 hours: `0 */4 * * *`</small>
            </div>
            <div className="form-group checkbox-group">
              <input type="checkbox" id="is_active" name="is_active" checked={newScraperForm.is_active} onChange={handleInputChange} />
              <label htmlFor="is_active">Is Active?</label>
            </div>
            <div className="form-group">
              <label htmlFor="scraping_method">Scraping Method:</label>
              <select id="scraping_method" name="scraping_method" value={newScraperForm.scraping_method} onChange={handleInputChange}>
                <option value="cheerio">Cheerio (Static HTML)</option>
                <option value="puppeteer">Puppeteer (Dynamic/JavaScript)</option>
              </select>
            </div>
            <button type="submit" className="submit-button">Create Scraper</button>
          </form>
        </div>
      )}

      {scrapers.length === 0 ? (
        <p>You haven't created any scrapers yet.</p>
      ) : (
        <div className="scraper-list">
          {scrapers.map((scraper) => (
            <div key={scraper.id} className="scraper-card">
              <h3>{scraper.name}</h3>
              <p>{scraper.description}</p>
              <p><strong>URL:</strong> <a href={scraper.start_url} target="_blank" rel="noopener noreferrer">{scraper.start_url}</a></p>
              <p><strong>Method:</strong> {scraper.scraping_method}</p>
              <p><strong>Status:</strong> {scraper.is_active ? 'Active' : 'Inactive'}</p>
              {scraper.schedule_cron && <p><strong>Schedule:</strong> {scraper.schedule_cron}</p>}
              <p><strong>Last Run:</strong> {scraper.last_run ? new Date(scraper.last_run).toLocaleString() : 'Never'}</p>
              <div className="scraper-actions">
                <Link to={`/scrapers/${scraper.id}`} className="button view-details">View Details</Link>
                <button onClick={() => handleTriggerScrape(scraper.id, scraper.name)} className="button trigger-scrape">Trigger Scrape</button>
                <Link to={`/scrapers/${scraper.id}/edit`} className="button edit-scraper">Edit</Link>
                <button onClick={() => handleDeleteScraper(scraper.id)} className="button delete-scraper">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;