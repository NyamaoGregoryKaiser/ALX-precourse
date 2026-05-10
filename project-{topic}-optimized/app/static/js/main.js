document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = window.location.origin + '/api/v1'; // Assumes API is served from the same host
    let accessToken = localStorage.getItem('accessToken');
    let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

    // DOM Elements
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const alertsSection = document.getElementById('alerts-section');
    const servicesManagementSection = document.getElementById('services-management-section');

    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutButton = document.getElementById('logout-button');
    const loginButton = document.getElementById('login-button');
    const userInfoSpan = document.getElementById('user-info');

    const dashboardLink = document.getElementById('dashboard-link');
    const alertsLink = document.getElementById('alerts-link');
    const servicesLink = document.getElementById('services-link');

    const servicesDashboard = document.getElementById('services-dashboard');
    const alertsList = document.getElementById('alerts-list');
    const servicesCrudList = document.getElementById('services-crud-list');
    const addServiceForm = document.getElementById('add-service-form');
    const addServiceError = document.getElementById('add-service-error');

    // --- Helper Functions ---
    function showSection(sectionId) {
        // Hide all main sections
        loginSection.style.display = 'none';
        dashboardSection.style.display = 'none';
        alertsSection.style.display = 'none';
        servicesManagementSection.style.display = 'none';

        // Remove active class from all nav links
        document.querySelectorAll('nav a').forEach(link => link.classList.remove('active'));

        // Show the target section and set active link
        if (sectionId === 'login') {
            loginSection.style.display = 'block';
        } else if (sectionId === 'dashboard') {
            dashboardSection.style.display = 'block';
            dashboardLink.classList.add('active');
            loadDashboardData();
        } else if (sectionId === 'alerts') {
            alertsSection.style.display = 'block';
            alertsLink.classList.add('active');
            loadAlerts();
        } else if (sectionId === 'services') {
            servicesManagementSection.style.display = 'block';
            servicesLink.classList.add('active');
            loadServicesForManagement();
        }
    }

    function updateAuthUI() {
        if (accessToken) {
            loginButton.style.display = 'none';
            logoutButton.style.display = 'inline-block';
            userInfoSpan.style.display = 'inline-block';
            userInfoSpan.textContent = `Welcome, ${currentUser?.email || 'User'} (${currentUser?.is_admin ? 'Admin' : 'Viewer'})`;
            
            // Show/hide admin-specific links
            if (currentUser?.is_admin) {
                servicesLink.style.display = 'inline-block';
            } else {
                servicesLink.style.display = 'none';
            }

            showSection('dashboard'); // Redirect to dashboard if logged in
        } else {
            loginButton.style.display = 'inline-block';
            logoutButton.style.display = 'none';
            userInfoSpan.style.display = 'none';
            servicesLink.style.display = 'none'; // Hide for logged out users
            showSection('login'); // Redirect to login if logged out
        }
    }

    async function fetchData(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        try {
            const response = await fetch(url, { ...options, headers });
            if (response.status === 401 || response.status === 403) {
                // Token expired or unauthorized, force logout
                logout();
                throw new Error('Unauthorized or session expired. Please log in again.');
            }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            throw error; // Re-throw to be caught by specific error handlers
        }
    }

    // --- Authentication Handlers ---
    async function handleLogin(event) {
        event.preventDefault();
        loginError.textContent = '';
        const formData = new URLSearchParams(new FormData(loginForm));

        try {
            const response = await fetch(`${API_BASE_URL}/login/access-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString()
            });

            if (!response.ok) {
                const errorData = await response.json();
                loginError.textContent = errorData.detail || 'Login failed.';
                return;
            }

            const data = await response.json();
            accessToken = data.access_token;
            localStorage.setItem('accessToken', accessToken);

            // Fetch current user info
            currentUser = await fetchData(`${API_BASE_URL}/users/me`);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            updateAuthUI();
            loginForm.reset();
        } catch (error) {
            loginError.textContent = error.message || 'An error occurred during login.';
            console.error('Login error:', error);
        }
    }

    function logout() {
        accessToken = null;
        currentUser = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('currentUser');
        updateAuthUI();
        alert('You have been logged out.');
    }

    // --- Dashboard Loaders ---
    async function loadDashboardData() {
        servicesDashboard.innerHTML = 'Loading services...';
        try {
            const services = await fetchData(`${API_BASE_URL}/services/with-latest-metrics`);
            renderServicesDashboard(services);
        } catch (error) {
            servicesDashboard.innerHTML = `<p class="error-message">Error loading services: ${error.message}</p>`;
        }
    }

    function renderServicesDashboard(services) {
        servicesDashboard.innerHTML = '';
        if (services.length === 0) {
            servicesDashboard.innerHTML = '<p>No services to display.</p>';
            return;
        }

        services.forEach(service => {
            const serviceCard = document.createElement('div');
            serviceCard.className = 'service-card';
            
            let metricsHtml = service.latest_metrics.map(metric => `
                <div class="metric-item">
                    <strong>${metric.metric_type_name}:</strong> ${metric.value}${metric.metric_type_unit || ''} 
                    <span style="font-size: 0.8em; color: #777;">(${new Date(metric.timestamp).toLocaleTimeString()})</span>
                </div>
            `).join('');

            serviceCard.innerHTML = `
                <h3>${service.name}</h3>
                <p>${service.description || 'No description'}</p>
                <div>
                    <h4>Latest Metrics:</h4>
                    ${metricsHtml || '<p>No metric data available.</p>'}
                </div>
            `;
            servicesDashboard.appendChild(serviceCard);
        });
    }

    async function loadAlerts() {
        alertsList.innerHTML = 'Loading alerts...';
        try {
            const alerts = await fetchData(`${API_BASE_URL}/alert_notifications?is_resolved=false&limit=50`);
            const resolvedAlerts = await fetchData(`${API_BASE_URL}/alert_notifications?is_resolved=true&limit=20&order_by=triggered_at_desc`);
            renderAlerts(alerts.concat(resolvedAlerts));
        } catch (error) {
            alertsList.innerHTML = `<p class="error-message">Error loading alerts: ${error.message}</p>`;
        }
    }

    function renderAlerts(alerts) {
        alertsList.innerHTML = '';
        if (alerts.length === 0) {
            alertsList.innerHTML = '<p>No alerts to display.</p>';
            return;
        }

        alerts.sort((a, b) => new Date(b.triggered_at) - new Date(a.triggered_at)); // Latest first

        alerts.forEach(alert => {
            const alertItem = document.createElement('div');
            alertItem.className = `alert-item ${alert.is_resolved ? 'resolved' : ''}`;
            alertItem.innerHTML = `
                <p>
                    <strong>Service:</strong> ${alert.service_name || 'N/A'} <br>
                    <strong>Metric:</strong> ${alert.metric_type_name || 'N/A'} <br>
                    <strong>Condition:</strong> ${alert.alert_rule_condition || 'N/A'} (Current: ${alert.current_value}) <br>
                    <strong>Triggered:</strong> ${new Date(alert.triggered_at).toLocaleString()} 
                    ${alert.is_resolved ? `<br><strong>Resolved:</strong> ${new Date(alert.resolved_at).toLocaleString()}` : ''}
                </p>
                ${!alert.is_resolved && currentUser?.is_admin ? `<button data-id="${alert.id}">Resolve</button>` : ''}
            `;
            alertsList.appendChild(alertItem);
        });

        // Add event listeners for resolve buttons
        alertsList.querySelectorAll('.alert-item button').forEach(button => {
            button.addEventListener('click', handleResolveAlert);
        });
    }

    async function handleResolveAlert(event) {
        const notificationId = event.target.dataset.id;
        if (!notificationId) return;

        if (!confirm('Are you sure you want to resolve this alert?')) {
            return;
        }

        try {
            await fetchData(`${API_BASE_URL}/alert_notifications/${notificationId}`, {
                method: 'PUT',
                body: JSON.stringify({ is_resolved: true, resolved_at: new Date().toISOString() })
            });
            alert('Alert resolved successfully!');
            loadAlerts(); // Reload alerts
        } catch (error) {
            alert(`Error resolving alert: ${error.message}`);
        }
    }

    // --- Services Management Loaders ---
    async function loadServicesForManagement() {
        servicesCrudList.innerHTML = 'Loading services...';
        try {
            const services = await fetchData(`${API_BASE_URL}/services`);
            renderServicesForManagement(services);
        } catch (error) {
            servicesCrudList.innerHTML = `<p class="error-message">Error loading services: ${error.message}</p>`;
        }
    }

    function renderServicesForManagement(services) {
        servicesCrudList.innerHTML = '';
        if (services.length === 0) {
            servicesCrudList.innerHTML = '<p>No services to manage.</p>';
            return;
        }

        services.forEach(service => {
            const serviceItem = document.createElement('div');
            serviceItem.className = 'crud-item';
            serviceItem.innerHTML = `
                <span>
                    <strong>${service.name}</strong> (${service.is_active ? 'Active' : 'Inactive'})
                    <br>${service.description || 'No description'}
                </span>
                <div class="crud-item-buttons">
                    <button class="edit-btn" data-id="${service.id}">Edit</button>
                    <button class="delete-btn" data-id="${service.id}">Delete</button>
                </div>
            `;
            servicesCrudList.appendChild(serviceItem);
        });

        servicesCrudList.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', handleEditService);
        });
        servicesCrudList.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', handleDeleteService);
        });
    }

    async function handleAddService(event) {
        event.preventDefault();
        addServiceError.textContent = '';
        const name = document.getElementById('new-service-name').value;
        const description = document.getElementById('new-service-description').value;

        try {
            await fetchData(`${API_BASE_URL}/services/`, {
                method: 'POST',
                body: JSON.stringify({ name, description })
            });
            alert('Service added successfully!');
            addServiceForm.reset();
            loadServicesForManagement();
        } catch (error) {
            addServiceError.textContent = error.message || 'Error adding service.';
        }
    }

    async function handleEditService(event) {
        const serviceId = event.target.dataset.id;
        if (!serviceId) return;

        // In a real app, this would open a modal with current data for editing
        alert(`Edit functionality for Service ID: ${serviceId} not fully implemented in UI demo.`);
        // For now, let's just show an example of an update
        const newDescription = prompt("Enter new description for this service:");
        if (newDescription === null) return; // User cancelled

        try {
            await fetchData(`${API_BASE_URL}/services/${serviceId}`, {
                method: 'PUT',
                body: JSON.stringify({ description: newDescription })
            });
            alert('Service updated successfully!');
            loadServicesForManagement();
        } catch (error) {
            alert(`Error updating service: ${error.message}`);
        }
    }

    async function handleDeleteService(event) {
        const serviceId = event.target.dataset.id;
        if (!serviceId) return;

        if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
            return;
        }

        try {
            await fetchData(`${API_BASE_URL}/services/${serviceId}`, {
                method: 'DELETE'
            });
            alert('Service deleted successfully!');
            loadServicesForManagement();
        } catch (error) {
            alert(`Error deleting service: ${error.message}`);
        }
    }

    // --- Event Listeners ---
    loginForm.addEventListener('submit', handleLogin);
    logoutButton.addEventListener('click', logout);
    loginButton.addEventListener('click', () => showSection('login'));

    dashboardLink.addEventListener('click', (e) => { e.preventDefault(); showSection('dashboard'); });
    alertsLink.addEventListener('click', (e) => { e.preventDefault(); showSection('alerts'); });
    servicesLink.addEventListener('click', (e) => { e.preventDefault(); showSection('services'); });
    
    addServiceForm.addEventListener('submit', handleAddService);

    // Initial load
    updateAuthUI();
    // Refresh dashboard data periodically if on dashboard
    setInterval(() => {
        if (dashboardSection.style.display === 'block' && accessToken) {
            loadDashboardData();
        }
        if (alertsSection.style.display === 'block' && accessToken) {
            loadAlerts();
        }
    }, 15000); // Refresh every 15 seconds
});
```

---

### 2. Database Layer

#### `alembic.ini`
```ini