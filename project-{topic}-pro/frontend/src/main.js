document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('app-container');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const contentBtn = document.getElementById('content-btn');
    const usersBtn = document.getElementById('users-btn');

    const API_BASE_URL = window.location.origin === 'http://localhost' ? 'http://localhost:9080' : '/api';

    let token = localStorage.getItem('jwtToken');
    let userId = localStorage.getItem('userId');
    let userRole = localStorage.getItem('userRole');

    function updateAuthUI() {
        if (token) {
            loginBtn.style.display = 'none';
            registerBtn.style.display = 'none';
            logoutBtn.style.display = 'inline-block';
            usersBtn.style.display = (userRole === 'admin') ? 'inline-block' : 'none'; // Only admin sees Users
        } else {
            loginBtn.style.display = 'inline-block';
            registerBtn.style.display = 'inline-block';
            logoutBtn.style.display = 'none';
            usersBtn.style.display = 'none';
        }
    }

    async function fetchData(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
        if (!response.ok) {
            const errorData = await response.text(); // Get raw text for errors
            console.error('API Error:', response.status, errorData);
            if (response.status === 401) {
                alert('Session expired or unauthorized. Please log in again.');
                logout();
            }
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }
        return response.json();
    }

    async function renderLoginPage() {
        appContainer.innerHTML = `
            <h2>Login</h2>
            <form id="login-form">
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" required>
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required>
                <button type="submit">Login</button>
                <p id="login-message" class="error-message"></p>
            </form>
        `;

        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageElement = document.getElementById('login-message');
            messageElement.textContent = '';
            const email = e.target.email.value;
            const password = e.target.password.value;

            try {
                const data = await fetchData('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });
                token = data.token;
                userId = data.userId;
                userRole = data.role;
                localStorage.setItem('jwtToken', token);
                localStorage.setItem('userId', userId);
                localStorage.setItem('userRole', userRole);
                updateAuthUI();
                renderHomePage(); // Redirect to home or dashboard
            } catch (error) {
                messageElement.textContent = error.message.includes('Unauthorized') ? 'Invalid email or password.' : `Error: ${error.message}`;
            }
        });
    }

    async function renderRegisterPage() {
        appContainer.innerHTML = `
            <h2>Register</h2>
            <form id="register-form">
                <label for="username">Username:</label>
                <input type="text" id="username" name="username" required>
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" required>
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required>
                <button type="submit">Register</button>
                <p id="register-message" class="error-message"></p>
            </form>
        `;

        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageElement = document.getElementById('register-message');
            messageElement.textContent = '';
            const username = e.target.username.value;
            const email = e.target.email.value;
            const password = e.target.password.value;

            try {
                await fetchData('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({ username, email, password })
                });
                messageElement.textContent = 'Registration successful! You can now log in.';
                messageElement.classList.remove('error-message');
                messageElement.classList.add('success-message');
                // Optionally redirect to login page
                setTimeout(renderLoginPage, 2000);
            } catch (error) {
                messageElement.textContent = `Error: ${error.message}`;
                messageElement.classList.remove('success-message');
                messageElement.classList.add('error-message');
            }
        });
    }

    function logout() {
        token = null;
        userId = null;
        userRole = null;
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        updateAuthUI();
        renderHomePage();
    }

    async function renderHomePage() {
        appContainer.innerHTML = `
            <h2>Welcome to the ALX CMS!</h2>
            <p>Use the navigation to explore or manage content.</p>
            <p>Your current role: <strong>${userRole || 'Guest'}</strong></p>
        `;
        try {
            // Example of fetching public content
            const publicContent = await fetchData('/content?status=published');
            let contentListHtml = '<h3>Latest Published Content:</h3><ul>';
            publicContent.forEach(item => {
                contentListHtml += `<li><h3>${item.title}</h3><p>${item.summary}</p><small>By Author ID: ${item.authorId}</small></li>`;
            });
            contentListHtml += '</ul>';
            appContainer.innerHTML += contentListHtml;
        } catch (error) {
            appContainer.innerHTML += `<p class="error-message">Could not fetch public content: ${error.message}</p>`;
        }
    }

    async function renderContentPage() {
        appContainer.innerHTML = `<h2>Content Management</h2><div id="content-list">Loading content...</div>`;
        try {
            // Fetches all content (published, draft, archived) if authorized.
            // For guests, this would only show published or fail if trying to fetch drafts.
            const allContent = await fetchData('/content');
            let contentListHtml = '<ul>';
            allContent.forEach(item => {
                contentListHtml += `<li><h3>${item.title} (${item.status})</h3><p>${item.summary}</p><small>Author: ${item.authorId}, Category: ${item.categoryId || 'N/A'}</small></li>`;
            });
            contentListHtml += '</ul>';
            document.getElementById('content-list').innerHTML = contentListHtml;
        } catch (error) {
            document.getElementById('content-list').innerHTML = `<p class="error-message">Error loading content: ${error.message}</p>`;
        }
    }

    async function renderUsersPage() {
        if (userRole !== 'admin') {
            appContainer.innerHTML = `<h2>Access Denied</h2><p class="error-message">You do not have permission to view users.</p>`;
            return;
        }

        appContainer.innerHTML = `<h2>User Management</h2><div id="user-list">Loading users...</div>`;
        try {
            const allUsers = await fetchData('/users');
            let userListHtml = '<ul>';
            allUsers.forEach(user => {
                userListHtml += `<li><h3>${user.username}</h3><p>Email: ${user.email}</p><p>Role: ${user.role}</p><small>ID: ${user.id}</small></li>`;
            });
            userListHtml += '</ul>';
            document.getElementById('user-list').innerHTML = userListHtml;
        } catch (error) {
            document.getElementById('user-list').innerHTML = `<p class="error-message">Error loading users: ${error.message}</p>`;
        }
    }

    // Event Listeners for navigation
    document.getElementById('home-btn').addEventListener('click', renderHomePage);
    loginBtn.addEventListener('click', renderLoginPage);
    registerBtn.addEventListener('click', renderRegisterPage);
    logoutBtn.addEventListener('click', logout);
    contentBtn.addEventListener('click', renderContentPage);
    usersBtn.addEventListener('click', renderUsersPage);

    // Initial load
    updateAuthUI();
    renderHomePage();
});