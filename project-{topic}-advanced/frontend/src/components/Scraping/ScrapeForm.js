import React, { useState } from 'react';
import './ScrapingForms.css';

function ScrapeForm({ onSubmit }) {
  const [url, setUrl] = useState('');
  const [targetElements, setTargetElements] = useState([{ name: '', selector: '', type: 'text', attribute: '' }]);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleAddElement = () => {
    setTargetElements([...targetElements, { name: '', selector: '', type: 'text', attribute: '' }]);
  };

  const handleRemoveElement = (index) => {
    const newElements = targetElements.filter((_, i) => i !== index);
    setTargetElements(newElements);
  };

  const handleChangeElement = (index, field, value) => {
    const newElements = targetElements.map((element, i) =>
      i === index ? { ...element, [field]: value } : element
    );
    setTargetElements(newElements);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);

    const filteredTargetElements = targetElements.filter(el => el.name && el.selector);
    if (!url || filteredTargetElements.length === 0) {
      setMessage('Please provide a URL and at least one valid target element.');
      setIsError(true);
      return;
    }

    const result = await onSubmit(url, filteredTargetElements);
    if (result.success) {
      setMessage('Scraping job created successfully!');
      setIsError(false);
      setUrl('');
      setTargetElements([{ name: '', selector: '', type: 'text', attribute: '' }]);
    } else {
      setMessage(result.message);
      setIsError(true);
    }
  };

  return (
    <div className="scrape-form-container">
      <h3>Create New Scraping Job</h3>
      <form onSubmit={handleSubmit} className="scrape-form">
        <div className="form-group">
          <label htmlFor="url">Target URL:</label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="e.g., https://example.com"
            required
          />
        </div>

        <h4>Elements to Extract:</h4>
        {targetElements.map((element, index) => (
          <div key={index} className="target-element-group">
            <div className="form-group">
              <label htmlFor={`name-${index}`}>Name:</label>
              <input
                type="text"
                id={`name-${index}`}
                value={element.name}
                onChange={(e) => handleChangeElement(index, 'name', e.target.value)}
                placeholder="e.g., productTitle"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor={`selector-${index}`}>CSS Selector:</label>
              <input
                type="text"
                id={`selector-${index}`}
                value={element.selector}
                onChange={(e) => handleChangeElement(index, 'selector', e.target.value)}
                placeholder="e.g., .product-card h2"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor={`type-${index}`}>Type:</label>
              <select
                id={`type-${index}`}
                value={element.type}
                onChange={(e) => handleChangeElement(index, 'type', e.target.value)}
              >
                <option value="text">Text</option>
                <option value="attribute">Attribute</option>
                <option value="html">HTML</option>
              </select>
            </div>
            {element.type === 'attribute' && (
              <div className="form-group">
                <label htmlFor={`attribute-${index}`}>Attribute Name:</label>
                <input
                  type="text"
                  id={`attribute-${index}`}
                  value={element.attribute}
                  onChange={(e) => handleChangeElement(index, 'attribute', e.target.value)}
                  placeholder="e.g., href, src"
                  required={element.type === 'attribute'}
                />
              </div>
            )}
            <button type="button" onClick={() => handleRemoveElement(index)} className="remove-button">
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={handleAddElement} className="add-element-button">
          Add Another Element
        </button>

        <button type="submit" className="submit-button">Start Scrape</button>
      </form>
      {message && <p className={isError ? 'error-message' : 'success-message'}>{message}</p>}
    </div>
  );
}

export default ScrapeForm;