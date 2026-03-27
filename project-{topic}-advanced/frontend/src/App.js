```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('jwt_token') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [models, setModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [predictionInput, setPredictionInput] = useState('');
  const [predictionResult, setPredictionResult] = useState(null);
  const [newModel, setNewModel] = useState({ name: '', description: '', type: 'CLASSIFICATION' });
  const [newModelVersion, setNewModelVersion] = useState({ versionNumber: '', modelPath: '', isDefault: false, metadata: '{}' });

  const authAxios = axios.create({
    baseURL: API_BASE_URL,
    headers: { Authorization: `Bearer ${token}` }
  });

  useEffect(() => {
    if (token) {
      fetchModels();
    } else {
      setModels([]);
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, { username, password });
      setToken(res.data.token);
      localStorage.setItem('jwt_token', res.data.token);
      setMessage('Login successful!');
      setUsername('');
      setPassword('');
    } catch (error) {
      setMessage('Login failed: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRegister = async (isAdmin = false) => {
    try {
      const endpoint = isAdmin ? `${API_BASE_URL}/auth/admin/register` : `${API_BASE_URL}/auth/register`;
      const res = await (isAdmin ? authAxios.post(endpoint, { username, password }) : axios.post(endpoint, { username, password }));
      setMessage(res.data);
    } catch (error) {
      setMessage('Registration failed: ' + (error.response?.data?.message || error.message || JSON.stringify(error.response?.data)));
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('jwt_token');
    setMessage('Logged out.');
  };

  const fetchModels = async () => {
    try {
      const res = await authAxios.get('/models');
      setModels(res.data);
    } catch (error) {
      setMessage('Failed to fetch models: ' + (error.response?.data?.message || error.message));
      if (error.response?.status === 401 || error.response?.status === 403) {
          handleLogout(); // Token invalid or unauthorized
      }
    }
  };

  const handleCreateModel = async (e) => {
    e.preventDefault();
    try {
      await authAxios.post('/models', newModel);
      setMessage('Model created successfully!');
      setNewModel({ name: '', description: '', type: 'CLASSIFICATION' });
      fetchModels();
    } catch (error) {
      setMessage('Failed to create model: ' + (error.response?.data?.message || error.message || JSON.stringify(error.response?.data)));
    }
  };

  const handleAddVersion = async (e) => {
    e.preventDefault();
    try {
      if (!selectedModelId) {
        setMessage('Please select a model first.');
        return;
      }
      await authAxios.post(`/models/${selectedModelId}/versions`, newModelVersion);
      setMessage('Model version added successfully!');
      setNewModelVersion({ versionNumber: '', modelPath: '', isDefault: false, metadata: '{}' });
      fetchModels(); // Refresh models to show new version
    } catch (error) {
      setMessage('Failed to add version: ' + (error.response?.data?.message || error.message || JSON.stringify(error.response?.data)));
    }
  };

  const handlePredict = async (e) => {
    e.preventDefault();
    try {
      if (!selectedModelId) {
        setMessage('Please select a model first.');
        return;
      }
      const inputData = JSON.parse(predictionInput);
      const res = await authAxios.post(`/inference/${selectedModelId}/predict`, { inputData });
      setPredictionResult(res.data);
      setMessage('Prediction successful!');
    } catch (error) {
      setMessage('Prediction failed: ' + (error.response?.data?.message || error.message || JSON.stringify(error.response?.data)));
      setPredictionResult(null);
    }
  };

  return (
    <div className="App">
      <h1>ML Utilities System</h1>

      {!token ? (
        <div className="auth-section">
          <h2>Login / Register</h2>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit">Login</button>
          </form>
          <button onClick={() => handleRegister(false)}>Register User</button>
          <p className="message">{message}</p>
        </div>
      ) : (
        <div className="main-app">
          <div className="header">
            <p>Logged in. <button onClick={handleLogout}>Logout</button></p>
            <p className="message">{message}</p>
          </div>

          <div className="section">
            <h2>Manage Models (Admin only)</h2>
            <form onSubmit={handleCreateModel}>
              <input
                type="text"
                placeholder="Model Name"
                value={newModel.name}
                onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
              />
              <input
                type="text"
                placeholder="Description"
                value={newModel.description}
                onChange={(e) => setNewModel({ ...newModel, description: e.target.value })}
              />
              <select value={newModel.type} onChange={(e) => setNewModel({ ...newModel, type: e.target.value })}>
                <option value="CLASSIFICATION">CLASSIFICATION</option>
                <option value="REGRESSION">REGRESSION</option>
                <option value="GENERATIVE">GENERATIVE</option>
              </select>
              <button type="submit">Create Model</button>
            </form>
            <button onClick={() => handleRegister(true)}>Register Admin (current user must be Admin)</button>
          </div>

          <div className="section">
            <h2>Add Model Version (Admin only)</h2>
            <form onSubmit={handleAddVersion}>
              <select value={selectedModelId} onChange={(e) => setSelectedModelId(e.target.value)}>
                <option value="">Select Model</option>
                {models.map(model => (
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Version Number (e.g., 1.0.0)"
                value={newModelVersion.versionNumber}
                onChange={(e) => setNewModelVersion({ ...newModelVersion, versionNumber: e.target.value })}
              />
              <input
                type="text"
                placeholder="Model Path (e.g., /models/model_name/v1.pkl)"
                value={newModelVersion.modelPath}
                onChange={(e) => setNewModelVersion({ ...newModelVersion, modelPath: e.target.value })}
              />
              <textarea
                placeholder="Metadata (JSON)"
                value={newModelVersion.metadata}
                onChange={(e) => setNewModelVersion({ ...newModelVersion, metadata: e.target.value })}
              />
              <label>
                Is Default:
                <input
                  type="checkbox"
                  checked={newModelVersion.isDefault}
                  onChange={(e) => setNewModelVersion({ ...newModelVersion, isDefault: e.target.checked })}
                />
              </label>
              <button type="submit">Add Version</button>
            </form>
          </div>

          <div className="section">
            <h2>Existing Models</h2>
            {models.length === 0 ? (
              <p>No models available. Create one first!</p>
            ) : (
              <ul>
                {models.map(model => (
                  <li key={model.id}>
                    <strong>{model.name}</strong> ({model.type}) - {model.description}
                    <ul>
                      {model.versions && model.versions.map(version => (
                        <li key={version.id}>
                          Version: {version.versionNumber} (Path: {version.modelPath}) {version.isDefault && '(Default)'}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="section">
            <h2>Make Prediction</h2>
            <form onSubmit={handlePredict}>
              <select value={selectedModelId} onChange={(e) => setSelectedModelId(e.target.value)}>
                <option value="">Select Model to Predict</option>
                {models.map(model => (
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
              </select>
              <textarea
                placeholder="Prediction Input (JSON, e.g., {'text': 'hello world'})"
                rows="5"
                value={predictionInput}
                onChange={(e) => setPredictionInput(e.target.value)}
              ></textarea>
              <button type="submit">Get Prediction (Default Version)</button>
            </form>
            {predictionResult && (
              <div className="prediction-result">
                <h3>Prediction Result:</h3>
                <p>Model: {predictionResult.modelName} (Version: {predictionResult.versionNumber})</p>
                <pre>{JSON.stringify(predictionResult.prediction, null, 2)}</pre>
                <p>Inference Time: {predictionResult.inferenceTimeMillis} ms</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
```