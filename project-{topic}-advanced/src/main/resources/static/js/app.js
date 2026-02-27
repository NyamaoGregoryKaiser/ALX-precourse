```javascript
document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = '/api/v1';
    let currentTaskPage = 0;
    const taskPageSize = 20; // Number of scraped data items per page

    // --- DOM Elements ---
    const navLinks = {
        login: document.getElementById('nav-login'),
        register: document.getElementById('nav-register'),
        tasks: document.getElementById('nav-tasks'),
    };
    const logoutBtn = document.getElementById('logout-btn');

    const sections = {
        login: document.getElementById('login-section'),
        register: document.getElementById('register-section'),
        tasks: document.getElementById('tasks-section'),
        taskForm: document.getElementById('task-form-section'),
        scrapedData: document.getElementById('scraped-data-section'),
    };

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const taskForm = document.getElementById('task-form');
    const createTaskBtn = document.getElementById('create-task-btn');
    const cancelTaskFormBtn = document.getElementById('cancel-task-form-btn');
    const addFieldBtn = document.getElementById('add-field-btn');
    const dataFieldsContainer = document.getElementById('data-fields-container');
    const backToTasksBtn = document.getElementById('back-to-tasks-btn');

    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    const tasksError = document.getElementById('tasks-error');
    const taskFormError = document.getElementById('task-form-error');
    const scrapedDataError = document.getElementById('scraped-data-error');

    const tasksList = document.getElementById('tasks-list');
    const scrapedDataList = document.getElementById('scraped-data-list');
    const scrapedDataTitle = document.getElementById('scraped-data-title');
    const scrapedTaskNameSpan = document.getElementById('scraped-task-name');

    // Pagination for scraped data
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const currentPageInfo = document.getElementById('current-page-info');

    // --- Utility Functions ---
    function showSection(sectionId) {
        Object.values(sections).forEach(section => section.classList.add('hidden'));
        document.getElementById(`${sectionId}-section`).classList.remove('hidden');

        Object.values(navLinks).forEach(link => link.classList.remove('active'));
        const activeNavLink = document.getElementById(`nav-${sectionId}`);
        if (activeNavLink) activeNavLink.classList.add('active');

        // Show/hide logout button based on authentication
        if (localStorage.getItem('jwtToken')) {
            logoutBtn.classList.remove('hidden');
            navLinks.tasks.classList.remove('hidden');
            if (sectionId === 'login' || sectionId === 'register') {
                showSection('tasks'); // Redirect to tasks if already logged in
            }
        } else {
            logoutBtn.classList.add('hidden');
            navLinks.tasks.classList.add('hidden');
            if (sectionId === 'tasks' || sectionId === 'taskForm' || sectionId === 'scrapedData') {
                showSection('login'); // Redirect to login if not authenticated
            }
        }
    }

    function showMessage(element, message, isError = true) {
        element.textContent = message;
        element.className = isError ? 'error-message' : 'success-message';
        element.classList.remove('hidden');
        setTimeout(() => element.classList.add('hidden'), 5000); // Hide after 5 seconds
    }

    async function fetchData(url, options = {}) {
        const token = localStorage.getItem('jwtToken');
        if (token) {
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${token}`
            };
        }
        options.headers = {
            ...options.headers,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        try {
            const response = await fetch(url, options);
            if (response.status === 401 || response.status === 403) {
                console.warn('Authentication/Authorization error. Redirecting to login.');
                localStorage.removeItem('jwtToken');
                showSection('login');
                showMessage(loginError, 'Session expired or unauthorized. Please log in again.', true);
                return null;
            }
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}` }));
                throw new Error(errorData.message || errorData.detail || `Server error: ${response.statusText}`);
            }
            return response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    // --- Authentication ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.classList.add('hidden');
        const username = e.target['login-username'].value;
        const password = e.target['login-password'].value;
        const authRequest = { username, password, email: "placeholder@example.com" }; // Email is dummy for login

        try {
            const data = await fetchData(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                body: JSON.stringify(authRequest)
            });
            if (data && data.token) {
                localStorage.setItem('jwtToken', data.token);
                localStorage.setItem('username', data.username);
                localStorage.setItem('userRole', data.role);
                showMessage(loginError, 'Login successful!', false);
                await loadTasks();
                showSection('tasks');
            }
        } catch (error) {
            showMessage(loginError, error.message || 'Login failed. Please check your credentials.', true);
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        registerError.classList.add('hidden');
        const username = e.target['register-username'].value;
        const email = e.target['register-email'].value;
        const password = e.target['register-password'].value;
        const authRequest = { username, email, password };

        try {
            const data = await fetchData(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                body: JSON.stringify(authRequest)
            });
            if (data && data.token) {
                localStorage.setItem('jwtToken', data.token);
                localStorage.setItem('username', data.username);
                localStorage.setItem('userRole', data.role);
                showMessage(registerError, 'Registration successful!', false);
                await loadTasks();
                showSection('tasks');
            }
        } catch (error) {
            showMessage(registerError, error.message || 'Registration failed. Username or email might be taken.', true);
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('username');
        localStorage.removeItem('userRole');
        showMessage(loginError, 'You have been logged out.', false);
        showSection('login');
    });

    // --- Task Management ---
    async function loadTasks() {
        tasksError.classList.add('hidden');
        tasksList.innerHTML = '<p>Loading tasks...</p>';
        try {
            const tasks = await fetchData(`${API_BASE_URL}/tasks`);
            tasksList.innerHTML = '';
            if (tasks.length === 0) {
                tasksList.innerHTML = '<p>No tasks found. Create one!</p>';
            } else {
                tasks.forEach(task => {
                    const taskCard = document.createElement('div');
                    taskCard.className = 'task-card';
                    taskCard.innerHTML = `
                        <h3>${task.name}</h3>
                        <p><strong>ID:</strong> ${task.id}</p>
                        <p><strong>URL:</strong> <a href="${task.targetUrl}" target="_blank">${task.targetUrl}</a></p>
                        <p><strong>Status:</strong> <span class="status status-${task.status}">${task.status}</span></p>
                        <p><strong>Cron:</strong> ${task.cronExpression || 'N/A'}</p>
                        <p><strong>Last Run:</strong> ${task.lastRunAt ? new Date(task.lastRunAt).toLocaleString() : 'Never'}</p>
                        <p><strong>Last Message:</strong> ${task.lastRunMessage || 'N/A'}</p>
                        <div class="task-card-actions">
                            <button class="view-data-btn" data-id="${task.id}" data-name="${task.name}">👁️ View Data</button>
                            <button class="trigger-btn" data-id="${task.id}">▶️ Trigger Now</button>
                            <button class="edit-btn" data-id="${task.id}">✏️ Edit</button>
                            <button class="delete-btn" data-id="${task.id}">🗑️ Delete</button>
                        </div>
                    `;
                    tasksList.appendChild(taskCard);
                });
            }
        } catch (error) {
            showMessage(tasksError, error.message || 'Failed to load tasks.', true);
        }
    }

    createTaskBtn.addEventListener('click', () => {
        taskForm.reset();
        document.getElementById('task-id').value = '';
        document.getElementById('task-form-title').textContent = 'Create New Task';
        document.getElementById('task-status').value = 'PENDING'; // Default for new task
        document.getElementById('task-status').disabled = true; // Status usually set by system on create

        // Clear existing data fields and add one empty row
        dataFieldsContainer.innerHTML = '';
        addNewDataField();
        showSection('taskForm');
    });

    cancelTaskFormBtn.addEventListener('click', () => {
        showSection('tasks');
        taskFormError.classList.add('hidden');
    });

    addFieldBtn.addEventListener('click', addNewDataField);

    function addNewDataField(fieldName = '', cssSelector = '', attribute = '') {
        const fieldItem = document.createElement('div');
        fieldItem.className = 'data-field-item';
        fieldItem.innerHTML = `
            <input type="text" class="field-name" placeholder="Field Name (e.g., productName)" value="${fieldName}" required>
            <input type="text" class="css-selector" placeholder="CSS Selector (e.g., .product h2)" value="${cssSelector}" required>
            <input type="text" class="attribute" placeholder="Attribute (optional, e.g., href)" value="${attribute}">
            <button type="button" class="remove-field-btn">Remove</button>
        `;
        dataFieldsContainer.appendChild(fieldItem);

        // Add event listener to the new remove button
        fieldItem.querySelector('.remove-field-btn').addEventListener('click', (e) => {
            if (dataFieldsContainer.children.length > 1) { // Always keep at least one field
                e.target.closest('.data-field-item').remove();
            } else {
                showMessage(taskFormError, 'A task must have at least one data field.', true);
            }
        });
    }

    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        taskFormError.classList.add('hidden');

        const taskId = document.getElementById('task-id').value;
        const name = e.target['task-name'].value;
        const targetUrl = e.target['task-url'].value;
        const cronExpression = e.target['task-cron'].value;
        const status = e.target['task-status'].value;

        const dataFields = [];
        dataFieldsContainer.querySelectorAll('.data-field-item').forEach(item => {
            const fieldName = item.querySelector('.field-name').value;
            const cssSelector = item.querySelector('.css-selector').value;
            const attribute = item.querySelector('.attribute').value;
            if (fieldName && cssSelector) { // Only add if essential fields are not empty
                dataFields.push({ fieldName, cssSelector, attribute });
            }
        });

        if (dataFields.length === 0) {
            showMessage(taskFormError, 'Please add at least one data field.', true);
            return;
        }

        let taskPayload;
        let method;
        let url;

        if (taskId) { // Edit existing task
            method = 'PUT';
            url = `${API_BASE_URL