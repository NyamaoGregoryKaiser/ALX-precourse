const API_BASE_URL = 'http://localhost:8080/api';
let jwtToken = localStorage.getItem('jwtToken') || null;
let currentAppId = null;
let currentAppName = null;
let currentMetricId = null;
let currentMetricName = null;
let currentApiKey = null; // Store API key for current app to simulate ingestion

// --- UI Elements ---
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const metricsSection = document.getElementById('metrics-section');
const metricDataSection = document.getElementById('metric-data-section');
const messageDiv = document.getElementById('message');
const logoutButton = document.getElementById('logout-button');
const currentAppNameSpan = document.getElementById('current-app-name');
const currentMetricNameSpan = document.getElementById('current-metric-name');

// --- Event Listeners ---
document.getElementById('register-form').addEventListener('submit', handleRegister);
document.getElementById('login-form').addEventListener('submit', handleLogin);
logoutButton.addEventListener('click', handleLogout);
document.getElementById('create-app-form').addEventListener('submit', handleCreateApplication);
document.getElementById('create-metric-form').addEventListener('submit', handleCreateMetric);
document.getElementById('ingest-data-form').addEventListener('submit', handleIngestMetricData);

// --- Auth Functions ---
async function handleRegister(event) {
    event.preventDefault();
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;
    const email = document.getElementById('reg-email').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, email, roles: ['USER'] }) // Default to USER role
        });
        const data = await response.text(); // Assuming text response for success/error
        if (response.ok) {
            showMessage(data, 'success');
        } else {
            showMessage(`Registration failed: ${data}`, 'error');
        }
    } catch (error) {
        showMessage(`Network error: ${error.message}`, 'error');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok) {
            jwtToken = data.jwt;
            localStorage.setItem('jwtToken', jwtToken);
            showMessage('Login successful!', 'success');
            renderAppSection();
        } else {
            showMessage(`Login failed: ${data.message || 'Invalid credentials'}`, 'error');
        }
    } catch (error) {
        showMessage(`Network error: ${error.message}`, 'error');
    }
}

function handleLogout() {
    jwtToken = null;
    localStorage.removeItem('jwtToken');
    showMessage('Logged out successfully.', 'success');
    renderAuthSection();
}

// --- UI Rendering Functions ---
function renderAuthSection() {
    authSection.style.display = 'block';
    appSection.style.display = 'none';
    metricsSection.style.display = 'none';
    metricDataSection.style.display = 'none';
    logoutButton.style.display = jwtToken ? 'block' : 'none';
}

function renderAppSection() {
    if (!jwtToken) {
        renderAuthSection();
        return;
    }
    authSection.style.display = 'none';
    appSection.style.display = 'block';
    metricsSection.style.display = 'none';
    metricDataSection.style.display = 'none';
    logoutButton.style.display = 'block';
    loadApplications();
}

function renderMetricsSection(appId, appName, apiKey) {
    currentAppId = appId;
    currentAppName = appName;
    currentApiKey = apiKey;
    currentAppNameSpan.textContent = appName;

    appSection.style.display = 'none';
    metricsSection.style.display = 'block';
    metricDataSection.style.display = 'none';
    loadMetrics(appId);
}

function renderMetricDataSection(metricId, metricName) {
    currentMetricId = metricId;
    currentMetricName = metricName;
    currentMetricNameSpan.textContent = metricName;

    metricsSection.style.display = 'none';
    metricDataSection.style.display = 'block';
    loadMetricData(metricId);
}

function goBackToApps() {
    currentAppId = null;
    currentAppName = null;
    currentApiKey = null;
    renderAppSection();
}

function goBackToMetrics() {
    currentMetricId = null;
    currentMetricName = null;
    renderMetricsSection(currentAppId, currentAppName, currentApiKey);
}

// --- API Interaction Functions ---
async function loadApplications() {
    try {
        const response = await fetch(`${API_BASE_URL}/applications`, {
            headers: { 'Authorization': `Bearer ${jwtToken}` }
        });
        const applications = await response.json();
        if (response.ok) {
            const appList = document.getElementById('app-list');
            appList.innerHTML = '';
            applications.forEach(app => {
                const row = appList.insertRow();
                row.innerHTML = `
                    <td>${app.id}</td>
                    <td>${app.name}</td>
                    <td>${app.description || ''}</td>
                    <td>${app.apiKey}</td>
                    <td class="button-group">
                        <button onclick="renderMetricsSection(${app.id}, '${app.name}', '${app.apiKey}')">View Metrics</button>
                        <button class="delete" onclick="handleDeleteApplication(${app.id})">Delete</button>
                    </td>
                `;
            });
        } else {
            showMessage(`Failed to load applications: ${applications.message || response.statusText}`, 'error');
        }
    } catch (error) {
        showMessage(`Network error: ${error.message}`, 'error');
    }
}

async function handleCreateApplication(event) {
    event.preventDefault();
    const name = document.getElementById('app-name').value;
    const description = document.getElementById('app-description').value;

    try {
        const response = await fetch(`${API_BASE_URL}/applications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({ name, description })
        });
        const data = await response.json();
        if (response.ok) {
            showMessage(`Application "${data.name}" created successfully! API Key: ${data.apiKey}`, 'success');
            document.getElementById('create-app-form').reset();
            loadApplications();
        } else {
            showMessage(`Failed to create application: ${data.message || response.statusText}`, 'error');
        }
    } catch (error) {
        showMessage(`Network error: ${error.message}`, 'error');
    }
}

async function handleDeleteApplication(appId) {
    if (!confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/applications/${appId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${jwtToken}` }
        });
        if (response.ok) {
            showMessage('Application deleted successfully!', 'success');
            loadApplications();
        } else {
            const error = await response.json();
            showMessage(`Failed to delete application: ${error.message || response.statusText}`, 'error');
        }
    } catch (error) {
        showMessage(`Network error: ${error.message}`, 'error');
    }
}

async function loadMetrics(appId) {
    try {
        const response = await fetch(`${API_BASE_URL}/applications/${appId}/metrics`, {
            headers: { 'Authorization': `Bearer ${jwtToken}` }
        });
        const metrics = await response.json();
        if (response.ok) {
            const metricList = document.getElementById('metric-list');
            metricList.innerHTML = '';
            metrics.forEach(metric => {
                const row = metricList.insertRow();
                row.innerHTML = `
                    <td>${metric.id}</td>
                    <td>${metric.name}</td>
                    <td>${metric.type}</td>
                    <td>${metric.description || ''}</td>
                    <td class="button-group">
                        <button onclick="renderMetricDataSection(${metric.id}, '${metric.name}')">View Data</button>
                        <button class="delete" onclick="handleDeleteMetric(${metric.id})">Delete</button>
                    </td>
                `;
            });
        } else {
            showMessage(`Failed to load metrics: ${metrics.message || response.statusText}`, 'error');
        }
    } catch (error) {
        showMessage(`Network error: ${error.message}`, 'error');
    }
}

async function handleCreateMetric(event) {
    event.preventDefault();
    const name = document.getElementById('metric-name').value;
    const description = document.getElementById('metric-description').value;
    const type = document.getElementById('metric-type').value;

    try {
        const response = await fetch(`${API_BASE_URL}/applications/${currentAppId}/metrics`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({ name, description, type })
        });
        const data = await response.json();
        if (response.ok) {
            showMessage(`Metric "${data.name}" created successfully!`, 'success');
            document.getElementById('create-metric-form').reset();
            loadMetrics(currentAppId);
        } else {
            showMessage(`Failed to create metric: ${data.message || response.statusText}`, 'error');
        }
    } catch (error) {
        showMessage(`Network error: ${error.message}`, 'error');
    }
}

async function handleDeleteMetric(metricId) {
    if (!confirm('Are you sure you want to delete this metric and all its associated data?')) {
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/applications/${currentAppId}/metrics/${metricId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${jwtToken}` }
        });
        if (response.ok) {
            showMessage('Metric deleted successfully!', 'success');
            loadMetrics(currentAppId);
        } else {
            const error = await response.json();
            showMessage(`Failed to delete metric: ${error.message || response.statusText}`, 'error');
        }
    } catch (error) {
        showMessage(`Network error: ${error.message}`, 'error');
    }
}

async function handleIngestMetricData(event) {
    event.preventDefault();
    const value = parseFloat(document.getElementById('data-value').value);
    const tags = document.getElementById('data-tags').value;

    const metricData = [{
        metricName: currentMetricName,
        value: value,
        timestamp: new Date().toISOString(), // ISO 8601 format
        tags: tags || null
    }];

    try {
        const response = await fetch(`${API_BASE_URL}/metric-data/ingest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': currentApiKey // Use the application's API key
            },
            body: JSON.stringify(metricData)
        });
        const data = await response.text();
        if (response.ok || response.status === 202) { // 202 Accepted
            showMessage(`Metric data ingested: ${data}`, 'success');
            document.getElementById('ingest-data-form').reset();
            loadMetricData(currentMetricId); // Refresh data display
        } else {
            showMessage(`Failed to ingest data: ${data}`, 'error');
        }
    } catch (error) {
        showMessage(`Network error: ${error.message}`, 'error');
    }
}

async function loadMetricData(metricId) {
    // Load data for the last 24 hours
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (24 * 60 * 60 * 1000));

    const params = new URLSearchParams({
        startTime: startTime.toISOString().slice(0, -5), // Remove Z and milliseconds for LocalDateTime
        endTime: endTime.toISOString().slice(0, -5)
    });

    try {
        const response = await fetch(`${API_BASE_URL}/metric-data/${metricId}?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${jwtToken}` }
        });
        const dataPoints = await response.json();
        if (response.ok) {
            const dataList = document.getElementById('metric-data-list');
            dataList.innerHTML = '';
            dataPoints.forEach(data => {
                const row = dataList.insertRow();
                row.innerHTML = `
                    <td>${data.id || 'N/A'}</td>
                    <td>${data.value.toFixed(2)}</td>
                    <td>${new Date(data.timestamp).toLocaleString()}</td>
                    <td>${data.tags || ''}</td>
                `;
            });
        } else {
            showMessage(`Failed to load metric data: ${dataPoints.message || response.statusText}`, 'error');
        }
    } catch (error) {
        showMessage(`Network error: ${error.message}`, 'error');
    }
}

// --- Utility Functions ---
function showMessage(msg, type) {
    messageDiv.textContent = msg;
    messageDiv.className = `message ${type}`;
    // Hide message after 5 seconds
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Initial render based on login status
if (jwtToken) {
    renderAppSection();
} else {
    renderAuthSection();
}