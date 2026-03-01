// Basic client-side script for form submission and message display
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');

    function showMessage(type, text) {
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = text;
        messageDiv.style.display = 'block';
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000); // Hide after 5 seconds
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = registerForm.username.value;
            const email = registerForm.email.value;
            const password = registerForm.password.value;

            try {
                const response = await fetch('/api/v1/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, email, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    showMessage('success', data.message || 'Registration successful! You can now log in.');
                    registerForm.reset();
                    // Redirect to login after successful registration
                    setTimeout(() => { window.location.href = '/login'; }, 2000);
                } else {
                    showMessage('error', data.message || data.error || 'Registration failed.');
                }
            } catch (error) {
                console.error('Network error:', error);
                showMessage('error', 'Network error. Please try again.');
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const identifier = loginForm.identifier.value;
            const password = loginForm.password.value;

            try {
                const response = await fetch('/api/v1/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ identifier, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    showMessage('success', data.message || 'Login successful!');
                    // Store JWT token (e.g., in localStorage)
                    if (data.data && data.data.token) {
                        localStorage.setItem('jwt_token', data.data.token);
                        console.log('JWT Token stored:', data.data.token);
                        // Redirect to a protected page or dashboard
                        // For this basic example, we'll just show a success message
                        // In a real app, you'd navigate to e.g., /dashboard
                        window.location.href = '/dashboard-placeholder.html'; // Example redirect
                    }
                } else {
                    showMessage('error', data.message || data.error || 'Login failed.');
                }
            } catch (error) {
                console.error('Network error:', error);
                showMessage('error', 'Network error. Please try again.');
            }
        });
    }

    // This is a placeholder for a dashboard page or similar protected resource.
    // In a real application, /dashboard-placeholder.html would be a server-rendered
    // page or a client-side route that makes authenticated API calls.
    // For now, it just demonstrates where a token would be used.
    if (window.location.pathname === '/dashboard-placeholder.html') {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
            // Not authenticated, redirect to login
            window.location.href = '/login';
        } else {
            console.log("Welcome to the dashboard! Your token:", token);
            // You can make authenticated API calls here
            // Example: fetch('/api/v1/users/self', { headers: { 'Authorization': `Bearer ${token}` } })
        }
    }
});
```