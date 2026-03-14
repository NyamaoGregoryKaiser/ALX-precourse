```javascript
let accessToken = localStorage.getItem('accessToken') || null;
let refreshToken = localStorage.getItem('refreshToken') || null;
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

const API_BASE_URL = '/api'; // Flask app serves from /api

function updateAuthDisplay() {
    const userDisplay = document.getElementById('current-user');
    const roleDisplay = document.getElementById('current-user-role');
    if (currentUser && currentUser.username) {
        userDisplay.textContent = currentUser.username;
        roleDisplay.textContent = currentUser.role;
    } else {
        userDisplay.textContent = 'None';
        roleDisplay.textContent = 'None';
    }
}

async function apiCall(method, url, data = null, requiresAuth = true) {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (requiresAuth && accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const config = {
        method: method,
        headers: headers,
    };

    if (data) {
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${url}`, config);
        const responseData = await response.json();
        document.getElementById('api-response').textContent = JSON.stringify(responseData, null, 2);

        if (!response.ok) {
            console.error(`API Error: ${response.status} - ${JSON.stringify(responseData)}`);
            // Attempt token refresh on 401
            if (response.status === 401 && requiresAuth && !url.includes('/auth/refresh')) {
                console.warn('Access token expired or invalid. Attempting refresh...');
                const success = await refreshAccessToken();
                if (success) {
                    console.log('Token refreshed. Retrying original request.');
                    return apiCall(method, url, data, requiresAuth); // Retry after refresh
                } else {
                    alert('Session expired. Please log in again.');
                    logoutUser();
                    throw new Error('Failed to refresh token. Session expired.');
                }
            }
            throw new Error(responseData.message || 'API request failed');
        }
        return responseData;
    } catch (error) {
        console.error('Network or API call error:', error);
        document.getElementById('api-response').textContent = `Error: ${error.message}`;
        throw error; // Re-throw to be caught by individual functions
    }
}

async function refreshAccessToken() {
    if (!refreshToken) {
        console.error('No refresh token available.');
        return false;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${refreshToken}`
            }
        });
        const data = await response.json();
        if (response.ok) {
            accessToken = data.access_token;
            localStorage.setItem('accessToken', accessToken);
            console.log('Access token successfully refreshed.');
            return true;
        } else {
            console.error('Failed to refresh token:', data.message);
            refreshToken = null; // Invalidate refresh token too
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('currentUser');
            updateAuthDisplay();
            return false;
        }
    } catch (error) {
        console.error('Error during token refresh:', error);
        return false;
    }
}

async function registerUser() {
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    const statusDiv = document.getElementById('reg-status');

    try {
        const data = await apiCall('POST', '/auth/register', { username, email, password, role }, false);
        statusDiv.className = 'success';
        statusDiv.textContent = `Registration successful for ${data.username}`;
    } catch (error) {
        statusDiv.className = 'error';
        statusDiv.textContent = error.message || 'Registration failed.';
    }
}

async function loginUser() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const statusDiv = document.getElementById('login-status');

    try {
        const data = await apiCall('POST', '/auth/login', { username, password }, false);
        accessToken = data.access_token;
        refreshToken = data.refresh_token;
        currentUser = data.user;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        statusDiv.className = 'success';
        statusDiv.textContent = `Logged in as ${currentUser.username}`;
        updateAuthDisplay();
    } catch (error) {
        statusDiv.className = 'error';
        statusDiv.textContent = error.message || 'Login failed.';
        accessToken = null;
        refreshToken = null;
        currentUser = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('currentUser');
        updateAuthDisplay();
    }
}

function logoutUser() {
    apiCall('POST', '/auth/logout') // Optionally hit logout endpoint
        .catch(err => console.error("Logout API call failed, but clearing local tokens anyway:", err))
        .finally(() => {
            accessToken = null;
            refreshToken = null;
            currentUser = null;
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('currentUser');
            updateAuthDisplay();
            document.getElementById('api-response').textContent = 'Logged out successfully.';
            document.getElementById('login-status').textContent = 'Logged out.';
        });
}

// User Management (Admin Only)
async function getUsers() {
    await apiCall('GET', '/users/');
}

async function getUserById() {
    const userId = document.getElementById('user-id').value;
    if (userId) await apiCall('GET', `/users/${userId}`);
}

async function updateUser() {
    const userId = document.getElementById('user-id').value;
    if (!userId) { alert('Enter User ID to update.'); return; }
    const updateData = {};
    const username = document.getElementById('user-update-username').value;
    const email = document.getElementById('user-update-email').value;
    const password = document.getElementById('user-update-password').value;
    const role = document.getElementById('user-update-role').value;
    const isActive = document.getElementById('user-update-is_active').checked;

    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (role) updateData.role = role;
    updateData.is_active = isActive;

    await apiCall('PUT', `/users/${userId}`, updateData);
}

async function deleteUser() {
    const userId = document.getElementById('user-id').value;
    if (userId) await apiCall('DELETE', `/users/${userId}`);
}

// Project Management
async function createProject() {
    const name = document.getElementById('project-name').value;
    const description = document.getElementById('project-description').value;
    const managerId = document.getElementById('project-manager-id').value;
    const data = { name, description };
    if (managerId) data.manager_id = parseInt(managerId);
    await apiCall('POST', '/projects/', data);
}

async function getProjects() {
    await apiCall('GET', '/projects/');
}

async function getProjectById() {
    const projectId = document.getElementById('project-id').value;
    if (projectId) await apiCall('GET', `/projects/${projectId}`);
}

async function updateProject() {
    const projectId = document.getElementById('project-id').value;
    if (!projectId) { alert('Enter Project ID to update.'); return; }
    const updateData = {};
    const name = document.getElementById('project-update-name').value;
    if (name) updateData.name = name;
    // Add other fields to update as needed
    await apiCall('PUT', `/projects/${projectId}`, updateData);
}

async function deleteProject() {
    const projectId = document.getElementById('project-id').value;
    if (projectId) await apiCall('DELETE', `/projects/${projectId}`);
}

// Task Management
async function createTask() {
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const projectId = document.getElementById('task-project-id').value;
    const assignedToId = document.getElementById('task-assigned-to-id').value;
    const status = document.getElementById('task-status').value;
    const dueDate = document.getElementById('task-due-date').value; // ISO 8601 format

    const data = { title, description, project_id: parseInt(projectId) };
    if (assignedToId) data.assigned_to_id = parseInt(assignedToId);
    if (status) data.status = status;
    if (dueDate) data.due_date = new Date(dueDate).toISOString();

    await apiCall('POST', '/tasks/', data);
}

async function getTasks() {
    await apiCall('GET', '/tasks/');
}

async function getTaskById() {
    const taskId = document.getElementById('task-id').value;
    if (taskId) await apiCall('GET', `/tasks/${taskId}`);
}

async function updateTask() {
    const taskId = document.getElementById('task-id').value;
    if (!taskId) { alert('Enter Task ID to update.'); return; }
    const updateData = {};
    const title = document.getElementById('task-update-title').value;
    if (title) updateData.title = title;
    // Add other fields to update as needed
    await apiCall('PUT', `/tasks/${taskId}`, updateData);
}

async function deleteTask() {
    const taskId = document.getElementById('task-id').value;
    if (taskId) await apiCall('DELETE', `/tasks/${taskId}`);
}

// Comment Management
async function addCommentToTask() {
    const taskId = document.getElementById('comment-task-id').value;
    const content = document.getElementById('comment-content').value;
    if (!taskId || !content) { alert('Enter Task ID and comment content.'); return; }
    await apiCall('POST', `/tasks/${taskId}/comments`, { content });
}

async function getTaskComments() {
    const taskId = document.getElementById('comment-task-id').value;
    if (taskId) await apiCall('GET', `/tasks/${taskId}/comments`);
}

async function updateComment() {
    const commentId = document.getElementById('comment-id').value;
    const content = document.getElementById('comment-update-content').value;
    if (!commentId || !content) { alert('Enter Comment ID and new content.'); return; }
    await apiCall('PUT', `/tasks/comments/${commentId}`, { content });
}

async function deleteComment() {
    const commentId = document.getElementById('comment-id').value;
    if (commentId) await apiCall('DELETE', `/tasks/comments/${commentId}`);
}

// Initial update on load
document.addEventListener('DOMContentLoaded', updateAuthDisplay);

```