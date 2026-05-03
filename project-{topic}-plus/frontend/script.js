const API_BASE_URL = 'http://localhost:8000/api/v1';

// DOM Elements
const authSection = document.getElementById('auth-section');
const loginForm = document.getElementById('login-form');
const authMessage = document.getElementById('auth-message');
const logoutBtn = document.getElementById('logout-btn');

const dashboardSection = document.getElementById('dashboard-section');
const currentUserInfo = document.getElementById('current-user-info');

const createProjectForm = document.getElementById('create-project-form');
const createProjectMessage = document.getElementById('create-project-message');
const projectsList = document.getElementById('projects-list');
const projectsMessage = document.getElementById('projects-message');

const tasksList = document.getElementById('tasks-list');
const tasksMessage = document.getElementById('tasks-message');

const taskDetailModal = document.getElementById('task-detail-modal');
const closeModalButton = taskDetailModal.querySelector('.close-button');
const updateTaskForm = document.getElementById('update-task-form');
const updateTaskMessage = document.getElementById('update-task-message');

let accessToken = localStorage.getItem('accessToken') || null;
let currentUserId = null;
let currentUserRole = null;

// --- Helper Functions ---
function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `message ${type}`;
    setTimeout(() => {
        element.textContent = '';
        element.className = 'message';
    }, 5000);
}

function isAuthenticated() {
    return accessToken !== null;
}

function updateUI() {
    if (isAuthenticated()) {
        authSection.style.display = 'none';
        dashboardSection.style.display = 'block';
        logoutBtn.style.display = 'inline-block';
        fetchCurrentUserInfo();
        fetchProjects();
        fetchTasks();
    } else {
        authSection.style.display = 'block';
        dashboardSection.style.display = 'none';
        logoutBtn.style.display = 'none';
        currentUserInfo.textContent = '';
        projectsList.innerHTML = '';
        tasksList.innerHTML = '';
    }
}

async function apiFetch(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 401) { // Unauthorized, token expired or invalid
            console.error("Unauthorized. Logging out.");
            logout();
            return null; // Return null to indicate failure and stop further processing
        }

        const data = await response.json();

        if (!response.ok) {
            const errorDetail = data.detail || `Error: ${response.status}`;
            throw new Error(errorDetail);
        }
        return data;

    } catch (error) {
        console.error("API Fetch Error:", error.message);
        throw error; // Re-throw to be caught by specific callers
    }
}

// --- Auth Functions ---
async function login(username, password) {
    try {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const data = await apiFetch('/auth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });

        if (data) {
            accessToken = data.access_token;
            localStorage.setItem('accessToken', accessToken);
            showMessage(authMessage, 'Login successful!', 'success');
            updateUI();
        }
    } catch (error) {
        showMessage(authMessage, `Login failed: ${error.message}`, 'error');
    }
}

function logout() {
    accessToken = null;
    localStorage.removeItem('accessToken');
    currentUserId = null;
    currentUserRole = null;
    showMessage(authMessage, 'Logged out successfully.', 'success');
    updateUI();
}

async function fetchCurrentUserInfo() {
    try {
        const user = await apiFetch('/users/me');
        if (user) {
            currentUserId = user.id;
            currentUserRole = user.role;
            currentUserInfo.textContent = `${user.full_name || user.username} (${user.role.toUpperCase()})`;
        }
    } catch (error) {
        console.error("Failed to fetch current user info:", error);
        currentUserInfo.textContent = 'Error loading user info.';
    }
}

// --- Project Functions ---
async function createProject(title, description, status) {
    try {
        const newProject = await apiFetch('/projects/', {
            method: 'POST',
            body: JSON.stringify({ title, description, status })
        });
        if (newProject) {
            showMessage(createProjectMessage, `Project "${newProject.title}" created!`, 'success');
            createProjectForm.reset();
            fetchProjects(); // Refresh list
        }
    } catch (error) {
        showMessage(createProjectMessage, `Failed to create project: ${error.message}`, 'error');
    }
}

async function fetchProjects() {
    projectsList.innerHTML = '<li>Loading projects...</li>';
    try {
        const projects = await apiFetch('/projects/');
        if (projects) {
            projectsList.innerHTML = '';
            if (projects.length === 0) {
                projectsList.innerHTML = '<li>No projects found.</li>';
                return;
            }
            projects.forEach(project => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${project.title} (${project.status}) - Owner: ${project.owner.username}</span>
                    <div>
                        <button class="view-project-tasks-btn" data-project-id="${project.id}">View Tasks</button>
                    </div>
                `;
                projectsList.appendChild(li);
            });
            // Attach event listeners for 'View Tasks' buttons
            document.querySelectorAll('.view-project-tasks-btn').forEach(button => {
                button.onclick = (event) => {
                    const projectId = event.target.dataset.projectId;
                    fetchTasks(projectId); // Fetch tasks for this specific project
                };
            });
        }
    } catch (error) {
        projectsList.innerHTML = `<li>Error loading projects: ${error.message}</li>`;
        showMessage(projectsMessage, `Error loading projects: ${error.message}`, 'error');
    }
}

// --- Task Functions ---
async function fetchTasks(projectId = null) {
    tasksList.innerHTML = '<li>Loading tasks...</li>';
    let endpoint = '/tasks/';
    if (projectId) {
        endpoint += `?project_id=${projectId}`;
    }
    try {
        const tasks = await apiFetch(endpoint);
        if (tasks) {
            tasksList.innerHTML = '';
            if (tasks.length === 0) {
                tasksList.innerHTML = '<li>No tasks found.</li>';
                return;
            }
            tasks.forEach(task => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>
                        <strong>${task.title}</strong> (${task.status}) - Project: ${task.project.title}
                        ${task.assignee ? ` - Assignee: ${task.assignee.username}` : ''}
                    </span>
                    <div>
                        <button class="view-task-btn" data-task-id="${task.id}">View/Edit</button>
                    </div>
                `;
                tasksList.appendChild(li);
            });
            // Attach event listeners for 'View/Edit' buttons
            document.querySelectorAll('.view-task-btn').forEach(button => {
                button.onclick = (event) => {
                    const taskId = event.target.dataset.taskId;
                    openTaskDetailModal(taskId);
                };
            });
        }
    } catch (error) {
        tasksList.innerHTML = `<li>Error loading tasks: ${error.message}</li>`;
        showMessage(tasksMessage, `Error loading tasks: ${error.message}`, 'error');
    }
}

async function openTaskDetailModal(taskId) {
    try {
        const task = await apiFetch(`/tasks/${taskId}`);
        if (task) {
            document.getElementById('modal-task-title').textContent = task.title;
            document.getElementById('modal-task-description').textContent = task.description || 'N/A';
            document.getElementById('modal-task-status').textContent = task.status;
            document.getElementById('modal-task-priority').textContent = task.priority;
            document.getElementById('modal-task-assignee').textContent = task.assignee ? task.assignee.full_name || task.assignee.username : 'Unassigned';
            document.getElementById('modal-task-due-date').textContent = task.due_date ? new Date(task.due_date).toLocaleString() : 'N/A';
            document.getElementById('modal-task-completed').textContent = task.is_completed ? 'Yes' : 'No';
            document.getElementById('modal-task-project').textContent = task.project.title;

            // Populate update form
            document.getElementById('update-task-id').value = task.id;
            document.getElementById('update-task-description').value = task.description || '';
            document.getElementById('update-task-status').value = task.status;
            if (task.due_date) {
                document.getElementById('update-task-due-date').value = new Date(task.due_date).toISOString().slice(0, 16);
            } else {
                document.getElementById('update-task-due-date').value = '';
            }
            document.getElementById('update-task-is-completed').checked = task.is_completed;

            taskDetailModal.style.display = 'block';
        }
    } catch (error) {
        console.error("Failed to fetch task details:", error);
        showMessage(tasksMessage, `Failed to load task details: ${error.message}`, 'error');
    }
}

async function updateTask(taskId, updateData) {
    try {
        const updatedTask = await apiFetch(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
        if (updatedTask) {
            showMessage(updateTaskMessage, `Task "${updatedTask.title}" updated!`, 'success');
            taskDetailModal.style.display = 'none';
            fetchTasks(); // Refresh tasks list
        }
    } catch (error) {
        showMessage(updateTaskMessage, `Failed to update task: ${error.message}`, 'error');
    }
}

// --- Event Listeners ---
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    await login(username, password);
});

logoutBtn.addEventListener('click', () => {
    logout();
});

createProjectForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = document.getElementById('project-title').value;
    const description = document.getElementById('project-description').value;
    const status = document.getElementById('project-status').value;
    await createProject(title, description, status);
});

closeModalButton.addEventListener('click', () => {
    taskDetailModal.style.display = 'none';
    updateTaskMessage.textContent = ''; // Clear message on close
});

window.addEventListener('click', (event) => {
    if (event.target == taskDetailModal) {
        taskDetailModal.style.display = 'none';
        updateTaskMessage.textContent = ''; // Clear message on close
    }
});

updateTaskForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const taskId = document.getElementById('update-task-id').value;
    const description = document.getElementById('update-task-description').value;
    const status = document.getElementById('update-task-status').value;
    const dueDate = document.getElementById('update-task-due-date').value;
    const isCompleted = document.getElementById('update-task-is-completed').checked;

    const updateData = {
        description: description,
        status: status,
        is_completed: isCompleted
    };

    if (dueDate) {
        updateData.due_date = new Date(dueDate).toISOString();
    } else {
        updateData.due_date = null; // Allow unsetting due date
    }

    await updateTask(taskId, updateData);
});

// Initial UI update on page load
document.addEventListener('DOMContentLoaded', updateUI);
```