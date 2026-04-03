document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const registerForm = document.getElementById('register-form');
    const successMessage = document.getElementById('success-message');
    const errorMessage = document.getElementById('error-message');
    const currentPath = window.location.pathname;

    function showMessage(element, message, isError = false) {
        element.textContent = message;
        element.className = isError ? 'error-message' : 'success-message';
        element.style.display = 'block';
        setTimeout(() => element.style.display = 'none', 5000);
    }

    function clearMessages() {
        if (successMessage) successMessage.style.display = 'none';
        if (errorMessage) errorMessage.style.display = 'none';
    }

    // --- Authentication Logic ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearMessages();

            const email = loginForm.email.value;
            const password = loginForm.password.value;

            try {
                const formData = new URLSearchParams();
                formData.append('username', email);
                formData.append('password', password);

                const response = await fetch('/api/v1/auth/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString(),
                });

                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem('access_token', data.access_token);
                    showMessage(successMessage, 'Login successful! Redirecting to dashboard...');
                    window.location.href = '/dashboard';
                } else {
                    const errorData = await response.json();
                    showMessage(errorMessage, errorData.detail || 'Login failed.', true);
                }
            } catch (error) {
                console.error('Login error:', error);
                showMessage(errorMessage, 'Network error during login.', true);
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('access_token');
            window.location.href = '/login';
        });
    }

    // Redirect to login if on dashboard and no token
    if (currentPath === '/dashboard' && !localStorage.getItem('access_token')) {
        window.location.href = '/login';
    }

    // --- Dashboard Specific Logic ---
    if (currentPath === '/dashboard') {
        const createDatasetForm = document.getElementById('create-dataset-form');
        const createModelForm = document.getElementById('create-model-form');
        const createExperimentForm = document.getElementById('create-experiment-form');
        const datasetsTableBody = document.getElementById('datasets-table-body');
        const modelsTableBody = document.getElementById('models-table-body');
        const experimentsTableBody = document.getElementById('experiments-table-body');
        const tabButtons = document.querySelectorAll('.tab-nav button');
        const tabContents = document.querySelectorAll('.tab-content');

        // Initial tab activation
        if (tabButtons.length > 0) {
            tabButtons[0].classList.add('active');
            tabContents[0].classList.remove('hidden');
        }

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.add('hidden'));

                button.classList.add('active');
                document.getElementById(button.dataset.tab).classList.remove('hidden');

                // Refresh data when switching tabs
                if (button.dataset.tab === 'datasets') fetchDatasets();
                if (button.dataset.tab === 'models') fetchModels();
                if (button.dataset.tab === 'experiments') fetchExperiments();
            });
        });

        async function authenticatedFetch(url, options = {}) {
            const token = localStorage.getItem('access_token');
            if (!token) {
                window.location.href = '/login'; // Redirect if no token
                throw new Error('No access token found');
            }

            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers,
            };

            const response = await fetch(url, { ...options, headers });

            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('access_token');
                window.location.href = '/login'; // Token expired or invalid
                throw new Error('Authentication failed, please log in again.');
            }
            return response;
        }

        // --- Dataset Management ---
        async function fetchDatasets() {
            clearMessages();
            try {
                const response = await authenticatedFetch('/api/v1/datasets');
                const datasets = await response.json();
                datasetsTableBody.innerHTML = '';
                if (datasets.length === 0) {
                    datasetsTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No datasets found.</td></tr>';
                    return;
                }
                datasets.forEach(dataset => {
                    const row = datasetsTableBody.insertRow();
                    row.insertCell(0).textContent = dataset.id;
                    row.insertCell(1).textContent = dataset.name;
                    row.insertCell(2).textContent = dataset.description || '-';
                    row.insertCell(3).textContent = dataset.file_path;
                    row.insertCell(4).textContent = dataset.file_type || '-';
                    row.insertCell(5).textContent = dataset.rows_count || '-';
                    row.insertCell(6).textContent = new Date(dataset.uploaded_at).toLocaleString();
                    const actionsCell = row.insertCell(7);
                    actionsCell.className = 'action-buttons';
                    actionsCell.innerHTML = `
                        <button onclick="editDataset(${dataset.id})">Edit</button>
                        <button class="delete-btn" onclick="deleteDataset(${dataset.id})">Delete</button>
                    `;
                });
            } catch (error) {
                console.error('Error fetching datasets:', error);
                showMessage(errorMessage, 'Failed to fetch datasets.', true);
            }
        }

        if (createDatasetForm) {
            createDatasetForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                clearMessages();
                const newDataset = {
                    name: createDatasetForm.name.value,
                    description: createDatasetForm.description.value,
                    file_path: createDatasetForm.file_path.value,
                    file_type: createDatasetForm.file_type.value || null,
                    file_size_bytes: createDatasetForm.file_size_bytes.value ? parseInt(createDatasetForm.file_size_bytes.value) : null,
                    rows_count: createDatasetForm.rows_count.value ? parseInt(createDatasetForm.rows_count.value) : null,
                    columns_count: createDatasetForm.columns_count.value ? parseInt(createDatasetForm.columns_count.value) : null,
                };
                try {
                    const response = await authenticatedFetch('/api/v1/datasets/', {
                        method: 'POST',
                        body: JSON.stringify(newDataset),
                    });
                    if (response.ok) {
                        showMessage(successMessage, 'Dataset created successfully!');
                        createDatasetForm.reset();
                        fetchDatasets();
                    } else {
                        const errorData = await response.json();
                        showMessage(errorMessage, errorData.detail || 'Failed to create dataset.', true);
                    }
                } catch (error) {
                    console.error('Error creating dataset:', error);
                    showMessage(errorMessage, 'Network error during dataset creation.', true);
                }
            });
        }

        window.editDataset = async (id) => {
            clearMessages();
            // In a real app, this would open a modal/form to edit
            alert(`Edit dataset with ID: ${id}. (Not fully implemented in this basic UI)`);
            // Example of fetching for editing purposes
            try {
                const response = await authenticatedFetch(`/api/v1/datasets/${id}`);
                const dataset = await response.json();
                console.log('Dataset to edit:', dataset);
                // Populate an edit form here
            } catch (error) {
                console.error('Error fetching dataset for edit:', error);
                showMessage(errorMessage, 'Failed to fetch dataset for editing.', true);
            }
        };

        window.deleteDataset = async (id) => {
            clearMessages();
            if (!confirm(`Are you sure you want to delete dataset with ID: ${id}?`)) {
                return;
            }
            try {
                const response = await authenticatedFetch(`/api/v1/datasets/${id}`, {
                    method: 'DELETE',
                });
                if (response.ok) {
                    showMessage(successMessage, 'Dataset deleted successfully!');
                    fetchDatasets();
                } else {
                    const errorData = await response.json();
                    showMessage(errorMessage, errorData.detail || 'Failed to delete dataset.', true);
                }
            } catch (error) {
                console.error('Error deleting dataset:', error);
                showMessage(errorMessage, 'Network error during dataset deletion.', true);
            }
        };


        // --- Model Management ---
        async function fetchModels() {
            clearMessages();
            try {
                const response = await authenticatedFetch('/api/v1/models');
                const models = await response.json();
                modelsTableBody.innerHTML = '';
                if (models.length === 0) {
                    modelsTableBody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No ML models found.</td></tr>';
                    return;
                }
                models.forEach(model => {
                    const row = modelsTableBody.insertRow();
                    row.insertCell(0).textContent = model.id;
                    row.insertCell(1).textContent = model.name;
                    row.insertCell(2).textContent = model.version;
                    row.insertCell(3).textContent = model.framework || '-';
                    row.insertCell(4).textContent = model.task_type || '-';
                    row.insertCell(5).textContent = JSON.stringify(model.metrics || {}) || '-';
                    row.insertCell(6).textContent = new Date(model.registered_at).toLocaleString();
                    const actionsCell = row.insertCell(7);
                    actionsCell.className = 'action-buttons';
                    actionsCell.innerHTML = `
                        <button onclick="editModel(${model.id})">Edit</button>
                        <button class="delete-btn" onclick="deleteModel(${model.id})">Delete</button>
                    `;
                });
            } catch (error) {
                console.error('Error fetching models:', error);
                showMessage(errorMessage, 'Failed to fetch models.', true);
            }
        }

        if (createModelForm) {
            createModelForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                clearMessages();
                const newModel = {
                    name: createModelForm.name.value,
                    version: createModelForm.version.value,
                    description: createModelForm.description.value,
                    model_path: createModelForm.model_path.value,
                    framework: createModelForm.framework.value || null,
                    task_type: createModelForm.task_type.value || null,
                    hyperparameters: createModelForm.hyperparameters.value ? JSON.parse(createModelForm.hyperparameters.value) : {},
                    metrics: createModelForm.metrics.value ? JSON.parse(createModelForm.metrics.value) : {},
                };
                try {
                    const response = await authenticatedFetch('/api/v1/models/', {
                        method: 'POST',
                        body: JSON.stringify(newModel),
                    });
                    if (response.ok) {
                        showMessage(successMessage, 'ML Model registered successfully!');
                        createModelForm.reset();
                        fetchModels();
                    } else {
                        const errorData = await response.json();
                        showMessage(errorMessage, errorData.detail || 'Failed to register ML Model.', true);
                    }
                } catch (error) {
                    console.error('Error registering model:', error);
                    showMessage(errorMessage, 'Network error during model registration.', true);
                }
            });
        }

        window.editModel = async (id) => {
            alert(`Edit ML Model with ID: ${id}. (Not fully implemented in this basic UI)`);
            try {
                const response = await authenticatedFetch(`/api/v1/models/${id}`);
                const model = await response.json();
                console.log('Model to edit:', model);
            } catch (error) {
                console.error('Error fetching model for edit:', error);
            }
        };

        window.deleteModel = async (id) => {
            if (!confirm(`Are you sure you want to delete ML Model with ID: ${id}?`)) {
                return;
            }
            try {
                const response = await authenticatedFetch(`/api/v1/models/${id}`, {
                    method: 'DELETE',
                });
                if (response.ok) {
                    showMessage(successMessage, 'ML Model deleted successfully!');
                    fetchModels();
                } else {
                    const errorData = await response.json();
                    showMessage(errorMessage, errorData.detail || 'Failed to delete ML Model.', true);
                }
            } catch (error) {
                console.error('Error deleting model:', error);
                showMessage(errorMessage, 'Network error during model deletion.', true);
            }
        };


        // --- Experiment Tracking ---
        async function fetchExperiments() {
            clearMessages();
            try {
                const response = await authenticatedFetch('/api/v1/experiments');
                const experiments = await response.json();
                experimentsTableBody.innerHTML = '';
                if (experiments.length === 0) {
                    experimentsTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No experiments found.</td></tr>';
                    return;
                }
                experiments.forEach(experiment => {
                    const row = experimentsTableBody.insertRow();
                    row.insertCell(0).textContent = experiment.id;
                    row.insertCell(1).textContent = experiment.name;
                    row.insertCell(2).textContent = experiment.run_id;
                    row.insertCell(3).textContent = experiment.status;
                    row.insertCell(4).textContent = JSON.stringify(experiment.metrics || {}) || '-';
                    row.insertCell(5).textContent = experiment.model_id || '-';
                    row.insertCell(6).textContent = experiment.dataset_id || '-';
                    row.insertCell(7).textContent = new Date(experiment.created_at).toLocaleString();
                    const actionsCell = row.insertCell(8);
                    actionsCell.className = 'action-buttons';
                    actionsCell.innerHTML = `
                        <button onclick="editExperiment(${experiment.id})">Edit</button>
                        <button class="delete-btn" onclick="deleteExperiment(${experiment.id})">Delete</button>
                    `;
                });
            } catch (error) {
                console.error('Error fetching experiments:', error);
                showMessage(errorMessage, 'Failed to fetch experiments.', true);
            }
        }

        if (createExperimentForm) {
            createExperimentForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                clearMessages();
                const newExperiment = {
                    name: createExperimentForm.name.value,
                    description: createExperimentForm.description.value,
                    parameters: createExperimentForm.parameters.value ? JSON.parse(createExperimentForm.parameters.value) : {},
                    metrics: createExperimentForm.metrics.value ? JSON.parse(createExperimentForm.metrics.value) : {},
                    artifacts_uri: createExperimentForm.artifacts_uri.value || null,
                    status: createExperimentForm.status.value,
                    model_id: createExperimentForm.model_id.value ? parseInt(createExperimentForm.model_id.value) : null,
                    dataset_id: createExperimentForm.dataset_id.value ? parseInt(createExperimentForm.dataset_id.value) : null,
                };
                try {
                    const response = await authenticatedFetch('/api/v1/experiments/', {
                        method: 'POST',
                        body: JSON.stringify(newExperiment),
                    });
                    if (response.ok) {
                        showMessage(successMessage, 'Experiment created successfully!');
                        createExperimentForm.reset();
                        fetchExperiments();
                    } else {
                        const errorData = await response.json();
                        showMessage(errorMessage, errorData.detail || 'Failed to create experiment.', true);
                    }
                } catch (error) {
                    console.error('Error creating experiment:', error);
                    showMessage(errorMessage, 'Network error during experiment creation.', true);
                }
            });
        }

        window.editExperiment = async (id) => {
            alert(`Edit Experiment with ID: ${id}. (Not fully implemented in this basic UI)`);
            try {
                const response = await authenticatedFetch(`/api/v1/experiments/${id}`);
                const experiment = await response.json();
                console.log('Experiment to edit:', experiment);
            } catch (error) {
                console.error('Error fetching experiment for edit:', error);
            }
        };

        window.deleteExperiment = async (id) => {
            if (!confirm(`Are you sure you want to delete Experiment with ID: ${id}?`)) {
                return;
            }
            try {
                const response = await authenticatedFetch(`/api/v1/experiments/${id}`, {
                    method: 'DELETE',
                });
                if (response.ok) {
                    showMessage(successMessage, 'Experiment deleted successfully!');
                    fetchExperiments();
                } else {
                    const errorData = await response.json();
                    showMessage(errorMessage, errorData.detail || 'Failed to delete Experiment.', true);
                }
            } catch (error) {
                console.error('Error deleting experiment:', error);
                showMessage(errorMessage, 'Network error during experiment deletion.', true);
            }
        };

        // Initial fetch for the default active tab (Datasets)
        fetchDatasets();
    }
});