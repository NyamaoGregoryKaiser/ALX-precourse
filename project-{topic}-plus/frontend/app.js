```javascript
document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:8080/api/v1'; // Adjust if your backend port changes

    // DOM Elements
    const authSection = document.getElementById('auth-section');
    const authForm = document.getElementById('auth-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const authMessage = document.getElementById('auth-message');
    const loginButton = document.getElementById('login-button');
    const registerButton = document.getElementById('register-button');

    const userInfoSection = document.getElementById('user-info-section');
    const userFullnameSpan = document.getElementById('user-fullname');
    const userRolesSpan = document.getElementById('user-roles');
    const logoutButton = document.getElementById('logout-button');

    const taskManagementSection = document.getElementById('task-management-section');
    const taskListDiv = document.getElementById('task-list');
    const addTaskForm = document.getElementById('add-task-form');
    const taskTitleInput = document.getElementById('task-title');
    const taskDescriptionInput = document.getElementById('task-description');
    const taskDueDateInput = document.getElementById('task-due-date');
    const taskStatusSelect = document.getElementById('task-status');
    const taskCategorySelect = document.getElementById('task-category');
    const taskMessage = document.getElementById('task-message');

    const adminSection = document.getElementById('admin-section');
    const categoryListDiv = document.getElementById('category-list');
    const addCategoryForm = document.getElementById('add-category-form');
    const categoryNameInput = document.getElementById('category-name');
    const adminMessage = document.getElementById('admin-message');


    let authToken = localStorage.getItem('jwtToken');
    let currentUser = null; // Store user details after login

    // --- Utility Functions ---
    function showSection(section) {
        document.querySelectorAll('section').forEach(sec => sec.classList.add('hidden'));
        section.classList.remove('hidden');
    }

    function displayMessage(element, message, isError = false) {
        element.textContent = message;
        element.style.color = isError ? 'red' : 'green';
        setTimeout(() => { element.textContent = ''; element.style.color = ''; }, 5000);
    }

    async function fetchData(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        try {
            const response = await fetch(url, { ...options, headers });
            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.message || (data.errors ? JSON.stringify(data.errors) : 'An unknown error occurred');
                throw new Error(`Error ${response.status}: ${errorMessage}`);
            }
            return data;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    // --- Authentication Logic ---
    async function handleAuth(endpoint, body) {
        try {
            const data = await fetchData(`${API_BASE_URL}/auth/${endpoint}`, {
                method: 'POST',
                body: JSON.stringify(body)
            });
            authToken = data.token;
            localStorage.setItem('jwtToken', authToken);
            await loadUserProfile(); // Load user profile immediately after login/register
            displayMessage(authMessage, `Successfully ${endpoint === 'register' ? 'registered' : 'logged in'}!`);
            renderApp();
        } catch (error) {
            displayMessage(authMessage, error.message, true);
        }
    }

    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;
        handleAuth('authenticate', { email, password });
    });

    registerButton.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        const fullName = email.split('@')[0]; // Simple full name for demo
        handleAuth('register', { fullName, email, password });
    });

    logoutButton.addEventListener('click', () => {
        authToken = null;
        localStorage.removeItem('jwtToken');
        currentUser = null;
        renderApp();
        displayMessage(authMessage, 'Logged out successfully.');
    });

    // --- User Profile Logic ---
    async function loadUserProfile() {
        if (!authToken) {
            currentUser = null;
            return;
        }
        try {
            currentUser = await fetchData(`${API_BASE_URL}/users/me`);
        } catch (error) {
            console.error('Failed to load user profile:', error);
            authToken = null; // Token might be invalid or expired
            localStorage.removeItem('jwtToken');
            currentUser = null;
        }
    }

    function renderUserProfile() {
        if (currentUser) {
            userFullnameSpan.textContent = currentUser.fullName;
            userRolesSpan.textContent = currentUser.roles.join(', ');
            userInfoSection.classList.remove('hidden');
        } else {
            userInfoSection.classList.add('hidden');
        }
    }

    // --- Task Management Logic ---
    async function loadCategoriesForSelect() {
        try {
            const categories = await fetchData(`${API_BASE_URL}/categories`);
            taskCategorySelect.innerHTML = ''; // Clear previous options
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                taskCategorySelect.appendChild(option);
            });
        } catch (error) {
            displayMessage(taskMessage, `Error loading categories: ${error.message}`, true);
        }
    }

    async function loadTasks() {
        taskListDiv.innerHTML = 'Loading tasks...';
        try {
            const tasks = await fetchData(`${API_BASE_URL}/tasks`);
            taskListDiv.innerHTML = ''; // Clear existing tasks
            if (tasks.length === 0) {
                taskListDiv.textContent = 'No tasks found. Create one!';
                return;
            }
            tasks.forEach(task => {
                const taskCard = document.createElement('div');
                taskCard.className = 'task-card';
                taskCard.innerHTML = `
                    <h3>${task.title}</h3>
                    <p><strong>Description:</strong> ${task.description || 'N/A'}</p>
                    <p><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleString()}</p>
                    <p><strong>Status:</strong> ${task.status}</p>
                    <p><strong>Category:</strong> ${task.category.name}</p>
                    <p><strong>Owner:</strong> ${task.owner.fullName} (${task.owner.email})</p>
                    <button class="edit-task-btn" data-id="${task.id}">Edit</button>
                    <button class="delete-task-btn" data-id="${task.id}">Delete</button>
                `;
                taskListDiv.appendChild(taskCard);
            });
            attachTaskEventListeners();
        } catch (error) {
            displayMessage(taskMessage, `Error loading tasks: ${error.message}`, true);
            taskListDiv.textContent = 'Failed to load tasks.';
        }
    }

    function attachTaskEventListeners() {
        document.querySelectorAll('.edit-task-btn').forEach(button => {
            button.onclick = (e) => {
                const taskId = e.target.dataset.id;
                // In a real app, this would open a modal to edit the task
                alert(`Edit task ${taskId} functionality not fully implemented in this demo.`);
            };
        });
        document.querySelectorAll('.delete-task-btn').forEach(button => {
            button.onclick = async (e) => {
                const taskId = e.target.dataset.id;
                if (confirm(`Are you sure you want to delete task ${taskId}?`)) {
                    try {
                        await fetchData(`${API_BASE_URL}/tasks/${taskId}`, { method: 'DELETE' });
                        displayMessage(taskMessage, `Task ${taskId} deleted successfully.`);
                        loadTasks(); // Reload tasks after deletion
                    } catch (error) {
                        displayMessage(taskMessage, `Error deleting task: ${error.message}`, true);
                    }
                }
            };
        });
    }

    addTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newTask = {
            title: taskTitleInput.value,
            description: taskDescriptionInput.value,
            dueDate: taskDueDateInput.value,
            status: taskStatusSelect.value,
            categoryId: parseInt(taskCategorySelect.value)
        };

        try {
            await fetchData(`${API_BASE_URL}/tasks`, {
                method: 'POST',
                body: JSON.stringify(newTask)
            });
            displayMessage(taskMessage, 'Task added successfully!');
            addTaskForm.reset();
            loadTasks();
        } catch (error) {
            displayMessage(taskMessage, `Error adding task: ${error.message}`, true);
        }
    });

    // --- Admin Section Logic ---
    async function loadCategoriesForAdmin() {
        categoryListDiv.innerHTML = 'Loading categories...';
        try {
            const categories = await fetchData(`${API_BASE_URL}/categories`);
            categoryListDiv.innerHTML = '';
            if (categories.length === 0) {
                categoryListDiv.textContent = 'No categories found.';
                return;
            }
            categories.forEach(category => {
                const categoryItem = document.createElement('div');
                categoryItem.className = 'category-item';
                categoryItem.innerHTML = `
                    <span>${category.name} (ID: ${category.id})</span>
                    <button class="delete-category-btn" data-id="${category.id}">Delete</button>
                `;
                categoryListDiv.appendChild(categoryItem);
            });
            attachCategoryEventListeners();
        } catch (error) {
            displayMessage(adminMessage, `Error loading categories: ${error.message}`, true);
            categoryListDiv.textContent = 'Failed to load categories (requires ADMIN role).';
        }
    }

    function attachCategoryEventListeners() {
        document.querySelectorAll('.delete-category-btn').forEach(button => {
            button.onclick = async (e) => {
                const categoryId = e.target.dataset.id;
                if (confirm(`Are you sure you want to delete category ${categoryId}? This will delete all associated tasks!`)) {
                    try {
                        await fetchData(`${API_BASE_URL}/categories/${categoryId}`, { method: 'DELETE' });
                        displayMessage(adminMessage, `Category ${categoryId} deleted successfully.`);
                        loadCategoriesForAdmin(); // Reload categories
                        loadCategoriesForSelect(); // Also reload for task form
                        loadTasks(); // Tasks might have been deleted, so reload
                    } catch (error) {
                        displayMessage(adminMessage, `Error deleting category: ${error.message}`, true);
                    }
                }
            };
        });
    }

    addCategoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newCategory = {
            name: categoryNameInput.value
        };

        try {
            await fetchData(`${API_BASE_URL}/categories`, {
                method: 'POST',
                body: JSON.stringify(newCategory)
            });
            displayMessage(adminMessage, 'Category added successfully!');
            addCategoryForm.reset();
            loadCategoriesForAdmin(); // Reload for admin view
            loadCategoriesForSelect(); // Also reload for task form
        } catch (error) {
            displayMessage(adminMessage, `Error adding category: ${error.message}`, true);
        }
    });


    // --- Render Application State ---
    async function renderApp() {
        if (!authToken || !currentUser) {
            showSection(authSection);
            // Pre-fill for quick testing
            emailInput.value = "user@taskmgr.com";
            passwordInput.value = "userpassword";
            return;
        }

        renderUserProfile();
        showSection(taskManagementSection);
        await loadCategoriesForSelect(); // Always load categories for the task form
        loadTasks();

        if (currentUser.roles.includes('ROLE_ADMIN')) {
            adminSection.classList.remove('hidden');
            loadCategoriesForAdmin();
        } else {
            adminSection.classList.add('hidden');
        }
    }

    // --- Initial Load ---
    async function init() {
        await loadUserProfile(); // Try to load user from stored token
        renderApp();
    }

    init();
});
```