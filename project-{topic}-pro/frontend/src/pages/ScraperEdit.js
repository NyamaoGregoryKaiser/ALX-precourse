import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './ScraperEdit.css';

const ScraperEdit = () => {
  const { scraperId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [scraper, setScraper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_url: '',
    selectors_json: '',
    schedule_cron: '',
    is_active: true,
    scraping_method: 'cheerio',
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchScraper = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/scrapers/${scraperId}`);
        setScraper(response.data);
        setFormData({
          name: response.data.name,
          description: response.data.description || '',
          start_url: response.data.start_url,
          selectors_json: JSON.stringify(JSON.parse(response.data.selectors_json), null, 2),
          schedule_cron: response.data.schedule_cron || '',
          is_active: response.data.is_active,
          scraping_method: response.data.scraping_method,
        });
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch scraper for editing.');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchScraper();
    }
  }, [isAuthenticated, authLoading, navigate, scraperId]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.patch(`/scrapers/${scraperId}`, formData);
      navigate(`/scrapers/${scraperId}`); // Go back to detail page
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to update scraper.');
    }
  };

  if (authLoading || loading) {
    return <div className="loading-spinner">Loading scraper data...</div>;
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  if (!scraper) {
    return <div className="not-found-message">Scraper not found for editing.</div>;
  }

  return (
    <div className="scraper-edit-container">
      <h1>Edit Scraper: {scraper.name}</h1>
      {formError && <p className="error-message">{formError}</p>}
      <form onSubmit={handleSubmit} className="scraper-edit-form">
        <div className="form-group">
          <label htmlFor="name">Name:</label>
          <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} required />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description:</label>
          <textarea id="description" name="description" value={formData.description} onChange={handleInputChange}></textarea>
        </div>
        <div className="form-group">
          <label htmlFor="start_url">Start URL:</label>
          <input type="url" id="start_url" name="start_url" value={formData.start_url} onChange={handleInputChange} required />
        </div>
        <div className="form-group">
          <label htmlFor="selectors_json">Selectors (JSON):</label>
          <textarea
            id="selectors_json"
            name="selectors_json"
            value={formData.selectors_json}
            onChange={handleInputChange}
            rows="15"
            cols="80"
            required
          ></textarea>
          <small>Ensure valid JSON format. Example: `{"item": "div.post", "fields": {"title": "h2", "link": {"selector": "a", "attr": "href"}}}`</small>
        </div>
        <div className="form-group">
          <label htmlFor="schedule_cron">Schedule (Cron):</label>
          <input type="text" id="schedule_cron" name="schedule_cron" value={formData.schedule_cron} onChange={handleInputChange} placeholder="e.g., 0 */4 * * *" />
          <small>Leave empty for manual triggering.</small>
        </div>
        <div className="form-group checkbox-group">
          <input type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleInputChange} />
          <label htmlFor="is_active">Is Active?</label>
        </div>
        <div className="form-group">
          <label htmlFor="scraping_method">Scraping Method:</label>
          <select id="scraping_method" name="scraping_method" value={formData.scraping_method} onChange={handleInputChange}>
            <option value="cheerio">Cheerio (Static HTML)</option>
            <option value="puppeteer">Puppeteer (Dynamic/JavaScript)</option>
          </select>
        </div>
        <div className="form-actions">
          <button type="submit" className="submit-button">Update Scraper</button>
          <button type="button" onClick={() => navigate(`/scrapers/${scraperId}`)} className="cancel-button">Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default ScraperEdit;