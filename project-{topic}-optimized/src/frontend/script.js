const API_BASE_URL = window.location.origin;
let jwtToken = localStorage.getItem('jwtToken') || null;
let currentUser = null; // Store user info from login/register response

const authStatusDiv = document.getElementById('auth-status');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const logoutBtn = document.getElementById('logout-btn');
const createContentSection = document.getElementById('create-content-section');
const contentTitleInput = document.getElementById('content-title');
const contentSlugInput = document.getElementById('content-slug');
const contentBodyTextarea = document.getElementById('content-body');
const contentStatusSelect = document.getElementById('content-status');
const contentListDiv = document.getElementById('content-list');

function updateAuthUI() {
    if (jwtToken) {
        authStatusDiv.innerHTML = `<span class="success">Logged in!</span>`;
        if (currentUser) {
             authStatusDiv.innerHTML += ` Welcome, <strong>${currentUser.username}</strong> (Role: ${currentUser.role}).`;
        }
        usernameInput.style.display = 'none';
        passwordInput.style.display = 'none';
        document.querySelector('.auth-section button:nth-of-type(1)').style.display = 'none'; // login
        document.querySelector('.auth-section button:nth-of-type(2)').style.display = 'none'; // register
        logoutBtn.style.display = 'inline-block';

        if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'editor')) {
            createContentSection.style.display = 'block';
        } else {
            createContentSection.style.display = 'none';
        }
    } else {
        authStatusDiv.innerHTML = `<span class="error">Not logged in.</span>`;
        usernameInput.style.display = 'inline-block';
        passwordInput.style.display = 'inline-block';
        document.querySelector('.auth-section button:nth-of-type(1)').style.display = 'inline-block';
        document.querySelector('.auth-section button:nth-of-type(2)').style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        createContentSection.style.display = 'none';
    }
}

async function apiRequest(method, path, body = null, authenticated = true) {
    const headers = {
        'Content-Type': 'application/json'
    };
    if (authenticated && jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
    }

    const options = {
        method,
        headers
    };
    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${path}`, options);
        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data.error || `HTTP error! status: ${response.status}`;
            throw new Error(errorMessage);
        }
        return data;
    } catch (error) {
        console.error("API Request Error:", error);
        authStatusDiv.innerHTML = `<span class="error">Error: ${error.message}</span>`;
        throw error;
    }
}

async function login() {
    try {
        const data = await apiRequest('POST', '/auth/login', {
            username: usernameInput.value,
            password: passwordInput.value
        }, false);
        jwtToken = data.token;
        localStorage.setItem('jwtToken', jwtToken);
        
        // Fetch user info after login to get role etc.
        const userDetails = await apiRequest('GET', `/users/${parseJwt(jwtToken).user_id}`);
        currentUser = userDetails;

        updateAuthUI();
        loadContent();
        usernameInput.value = '';
        passwordInput.value = '';
    } catch (error) {
        // Error already displayed by apiRequest
    }
}

async function register() {
    try {
        const data = await apiRequest('POST', '/auth/register', {
            username: usernameInput.value,
            email: `${usernameInput.value}@example.com`, // Simple email for demo
            password: passwordInput.value
        }, false);
        jwtToken = data.token;
        localStorage.setItem('jwtToken', jwtToken);
        currentUser = data.user; // User object returned on registration
        updateAuthUI();
        loadContent();
        usernameInput.value = '';
        passwordInput.value = '';
    } catch (error) {
        // Error already displayed by apiRequest
    }
}

function logout() {
    jwtToken = null;
    currentUser = null;
    localStorage.removeItem('jwtToken');
    updateAuthUI();
    loadContent(); // Reload content, now as unauthenticated user
}

async function loadContent() {
    contentListDiv.innerHTML = 'Loading content...';
    try {
        let path = '/content';
        let authenticated = true;
        let statusFilter = '';

        if (!jwtToken) {
            // If not authenticated, only show published content
            path = '/content?status=published';
            authenticated = false;
        } else if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'editor')) {
            // Admins/Editors can see all, let server decide filter based on params or lack thereof
            // We can add options here to filter by status for advanced UI
        } else {
            // Viewers only see published content even if authenticated
            path = '/content?status=published';
        }

        const content = await apiRequest('GET', path, null, authenticated);
        contentListDiv.innerHTML = '';
        if (content.length === 0) {
            contentListDiv.innerHTML = '<p>No content available.</p>';
            return;
        }
        content.forEach(item => {
            const contentItem = document.createElement('div');
            contentItem.className = 'content-item';
            contentItem.innerHTML = `
                <h3>${item.title} (${item.status})</h3>
                <p>${item.body.substring(0, 100)}...</p>
                <p><em>Author: ${item.author_id} | Created: ${new Date(item.created_at).toLocaleDateString()}</em></p>
                ${jwtToken && currentUser && (currentUser.id === item.author_id || currentUser.role === 'admin') ? 
                    `<button onclick="editContent('${item.id}')">Edit</button>
                     <button onclick="deleteContent('${item.id}')" style="background-color: #dc3545;">Delete</button>` 
                    : ''}
            `;
            contentListDiv.appendChild(contentItem);
        });
    } catch (error) {
        contentListDiv.innerHTML = `<p class="error">Failed to load content: ${error.message}</p>`;
    }
}

async function createContent() {
    try {
        const newContent = {
            title: contentTitleInput.value,
            slug: contentSlugInput.value,
            body: contentBodyTextarea.value,
            status: contentStatusSelect.value
        };
        const data = await apiRequest('POST', '/content', newContent);
        authStatusDiv.innerHTML = `<span class="success">${data.message || 'Content created successfully!'}</span>`;
        contentTitleInput.value = '';
        contentSlugInput.value = '';
        contentBodyTextarea.value = '';
        contentStatusSelect.value = 'draft';
        loadContent();
    } catch (error) {
        // Error already displayed
    }
}

async function editContent(contentId) {
    // For a full implementation, this would open a modal or navigate to an edit page.
    // For this minimal demo, we'll just log and show an alert.
    alert(`Editing content ID: ${contentId} (Not fully implemented in this demo)`);
    // Example: fetch content by ID to pre-fill a form
    // const content = await apiRequest('GET', `/content/${contentId}`);
    // console.log("Content to edit:", content);
}

async function deleteContent(contentId) {
    if (!confirm('Are you sure you want to delete this content?')) {
        return;
    }
    try {
        await apiRequest('DELETE', `/content/${contentId}`);
        authStatusDiv.innerHTML = `<span class="success">Content deleted successfully!</span>`;
        loadContent();
    } catch (error) {
        // Error already displayed
    }
}

// Helper to decode JWT and get user ID
function parseJwt (token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const payload = JSON.parse(jsonPayload);
        return {
            user_id: payload.user_id,
            username: payload.username,
            role: payload.role
        };
    } catch (e) {
        console.error("Failed to parse JWT", e);
        return {};
    }
};

// On page load
document.addEventListener('DOMContentLoaded', async () => {
    if (jwtToken) {
        try {
            const payload = parseJwt(jwtToken);
            if (payload && payload.user_id) {
                // Verify token by fetching current user data
                const userDetails = await apiRequest('GET', `/users/${payload.user_id}`);
                currentUser = userDetails; // Populate currentUser from verified token and fetched details
            } else {
                logout(); // Token invalid or corrupt
            }
        } catch (e) {
            console.error("Initial JWT verification failed:", e);
            logout();
        }
    }
    updateAuthUI();
    loadContent();
});
```