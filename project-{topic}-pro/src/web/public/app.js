```javascript
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerBtn = document.getElementById('registerBtn');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const authSection = document.getElementById('authSection');
    const dashboard = document.getElementById('dashboard');
    const authMessage = document.getElementById('authMessage');
    const lastUpdatedSpan = document.getElementById('lastUpdated');
    const refreshIntervalSpan = document.getElementById('refreshInterval');

    let authToken = localStorage.getItem('authToken');
    const API_BASE_URL = '/api/v1';
    const REFRESH_INTERVAL_SECONDS = 5; // How often to fetch data

    // Chart instances
    let cpuChart, memoryChart, netInChart, apiResponseChart;

    const metricCharts = {
        'system.cpu.usage': { id: 'cpuChart', label: 'CPU Usage (%)', color: 'rgba(54, 162, 235, 1)' },
        'system.memory.used_gb': { id: 'memoryChart', label: 'Memory Used (GB)', color: 'rgba(255, 99, 132, 1)' },
        'system.network.in_mbps': { id: 'netInChart', label: 'Network In (MB/s)', color: 'rgba(75, 192, 192, 1)' },
        'app.api.response_time_ms': { id: 'apiResponseChart', label: 'API Response Time (ms)', color: 'rgba(153, 102, 255, 1)' }
        // Add more metrics and their chart configurations as needed
    };

    refreshIntervalSpan.textContent = REFRESH_INTERVAL_SECONDS;

    function renderChart(canvasId, label, data, borderColor) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => new Date(d.timestamp).toLocaleTimeString()),
                datasets: [{
                    label: label,
                    data: data.map(d => d.value),
                    borderColor: borderColor,
                    backgroundColor: 'rgba(0, 0, 0, 0)',
                    borderWidth: 2,
                    pointRadius: 0 // No points
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: {
                            maxRotation: 0,
                            minRotation: 0,
                            autoSkipPadding: 10
                        }
                    },
                    y: {
                        beginAtZero: true
                    }
                },
                animation: false, // Disable animations for real-time feel
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    async function fetchMetricsForChart(metricName) {
        const now = Date.now();
        const oneHourAgo = now - 3600 * 1000; // Last 1 hour
        const url = `${API_BASE_URL}/metrics/${metricName}?start=${oneHourAgo}&end=${now}&limit=60`; // Get last 60 points
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Error fetching ${metricName}:`, error);
            authMessage.textContent = `Error fetching metrics: ${error.message}. Please log in again.`;
            logout();
            return [];
        }
    }

    async function updateDashboard() {
        if (!authToken) return;

        lastUpdatedSpan.textContent = new Date().toLocaleTimeString();

        for (const metricKey in metricCharts) {
            const chartConfig = metricCharts[metricKey];
            const data = await fetchMetricsForChart(metricKey);

            if (data.length > 0) {
                const chartElement = document.getElementById(chartConfig.id);
                if (!chartElement) continue;

                // Destroy existing chart if it exists
                let chartInstance = window[`${chartConfig.id}Instance`];
                if (chartInstance) {
                    chartInstance.destroy();
                }

                // Render new chart
                window[`${chartConfig.id}Instance`] = renderChart(
                    chartConfig.id,
                    chartConfig.label,
                    data,
                    chartConfig.color
                );
            }
        }
    }

    function showDashboard() {
        authSection.style.display = 'none';
        dashboard.style.display = 'block';
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        authMessage.textContent = '';
        updateDashboard();
        setInterval(updateDashboard, REFRESH_INTERVAL_SECONDS * 1000);
    }

    function showAuth() {
        authSection.style.display = 'block';
        dashboard.style.display = 'none';
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
    }

    function login(username, password) {
        fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json().then(data => ({ status: response.status, body: data })))
        .then(({ status, body }) => {
            if (status === 200 && body.token) {
                authToken = body.token;
                localStorage.setItem('authToken', authToken);
                authMessage.textContent = 'Login successful!';
                authMessage.style.color = 'green';
                showDashboard();
            } else {
                authMessage.textContent = body.message || 'Login failed.';
                authMessage.style.color = 'red';
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            authMessage.textContent = 'Network error during login.';
            authMessage.style.color = 'red';
        });
    }

    function register(username, password) {
        fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json().then(data => ({ status: response.status, body: data })))
        .then(({ status, body }) => {
            if (status === 201) {
                authMessage.textContent = 'Registration successful! You can now log in.';
                authMessage.style.color = 'green';
            } else {
                authMessage.textContent = body.message || 'Registration failed.';
                authMessage.style.color = 'red';
            }
        })
        .catch(error => {
            console.error('Register error:', error);
            authMessage.textContent = 'Network error during registration.';
            authMessage.style.color = 'red';
        });
    }

    function logout() {
        authToken = null;
        localStorage.removeItem('authToken');
        showAuth();
        authMessage.textContent = 'Logged out successfully.';
        authMessage.style.color = 'green';
        // Clear chart data if they exist
        for (const metricKey in metricCharts) {
            const chartConfig = metricCharts[metricKey];
            let chartInstance = window[`${chartConfig.id}Instance`];
            if (chartInstance) {
                chartInstance.destroy();
                window[`${chartConfig.id}Instance`] = null; // Clear reference
            }
        }
    }

    // Event Listeners
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        login(username, password);
    });

    registerBtn.addEventListener('click', () => {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        if (username && password) {
            register(username, password);
        } else {
            authMessage.textContent = 'Please enter both username and password for registration.';
            authMessage.style.color = 'red';
        }
    });

    logoutBtn.addEventListener('click', logout);
    loginBtn.addEventListener('click', showAuth); // If someone manually logs out, they can click login to see the form again.

    // Initial check
    if (authToken) {
        showDashboard();
    } else {
        showAuth();
    }
});
```