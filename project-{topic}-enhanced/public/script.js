```javascript
const API_BASE_URL = 'http://localhost:5000/api/v1';

let accessToken = localStorage.getItem('accessToken') || null;
let refreshToken = localStorage.getItem('refreshToken') || null;

const updateTokenDisplays = () => {
    document.getElementById('accessTokenDisplay').textContent = accessToken ? accessToken.substring(0, 30) + '...' : 'No token';
    document.getElementById('refreshTokenDisplay').textContent = refreshToken ? refreshToken.substring(0, 30) + '...' : 'No token';
};

const callApi = async (method, path, body = null, authRequired = true) => {
    const headers = {
        'Content-Type': 'application/json',
    };
    if (authRequired && accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const options = {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
    };

    try {
        const response = await fetch(`${API_BASE_URL}${path}`, options);
        const data = await response.json();

        if (!response.ok) {
            // Handle specific errors like token expiry
            if (response.status === 401 && data.message === 'Your token has expired! Please log in again!') {
                console.warn("Access token expired. Attempting to refresh...");
                const refreshed = await refreshAccessToken();
                if (refreshed) {
                    // Retry original call with new token
                    console.log("Token refreshed, retrying original request.");
                    return await callApi(method, path, body, authRequired);
                } else {
                    throw new Error("Failed to refresh token. Please login again.");
                }
            }
            throw new Error(data.message || 'Something went wrong');
        }
        return data;
    } catch (error) {
        console.error("API call error:", error);
        throw error;
    }
};

const refreshAccessToken = async () => {
    if (!refreshToken) {
        alert("No refresh token available. Please log in.");
        return false;
    }
    try {
        const data = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });
        const json = await data.json();
        if (data.ok) {
            accessToken = json.tokens.accessToken;
            refreshToken = json.tokens.refreshToken; // Refresh tokens can also be rotated
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            updateTokenDisplays();
            document.getElementById('tokenOutput').innerHTML = `<p class="success">Access token refreshed successfully!</p>`;
            return true;
        } else {
            throw new Error(json.message || "Failed to refresh token.");
        }
    } catch (error) {
        console.error("Error refreshing token:", error);
        document.getElementById('tokenOutput').innerHTML = `<p class="error">Error refreshing token: ${error.message}</p>`;
        accessToken = null;
        refreshToken = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        updateTokenDisplays();
        return false;
    }
};


// --- Event Listeners and Output Functions ---

const displayOutput = (elementId, data, isError = false) => {
    const outputElement = document.getElementById(elementId);
    outputElement.className = `output ${isError ? 'error' : 'success'}`;
    outputElement.textContent = JSON.stringify(data, null, 2);
};

// Register
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;
    try {
        const data = await callApi('POST', '/auth/register', { username, email, password, role }, false);
        displayOutput('registerOutput', data);
        accessToken = data.tokens.accessToken;
        refreshToken = data.tokens.refreshToken;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        updateTokenDisplays();
    } catch (error) {
        displayOutput('registerOutput', { message: error.message }, true);
    }
});

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    try {
        const data = await callApi('POST', '/auth/login', { email, password }, false);
        displayOutput('loginOutput', data);
        accessToken = data.tokens.accessToken;
        refreshToken = data.tokens.refreshToken;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        updateTokenDisplays();
    } catch (error) {
        displayOutput('loginOutput', { message: error.message }, true);
    }
});

// Refresh Token
document.getElementById('refreshTokenBtn').addEventListener('click', async () => {
    try {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            displayOutput('tokenOutput', { message: "Access token refreshed successfully!" });
        } else {
            displayOutput('tokenOutput', { message: "Failed to refresh token. Please login again." }, true);
        }
    } catch (error) {
        displayOutput('tokenOutput', { message: error.message }, true);
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        const data = await callApi('POST', '/auth/logout', { refreshToken }, true);
        displayOutput('tokenOutput', data);
        accessToken = null;
        refreshToken = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        updateTokenDisplays();
    } catch (error) {
        displayOutput('tokenOutput', { message: error.message }, true);
    }
});

// Get My Profile
document.getElementById('getProfileBtn').addEventListener('click', async () => {
    try {
        const data = await callApi('GET', '/auth/profile', null, true);
        displayOutput('getProfileOutput', data);
    } catch (error) {
        displayOutput('getProfileOutput', { message: error.message }, true);
    }
});

// Get All Users (Admin)
document.getElementById('getAllUsersBtn').addEventListener('click', async () => {
    try {
        const data = await callApi('GET', '/users', null, true);
        displayOutput('getAllUsersOutput', data);
    } catch (error) {
        displayOutput('getAllUsersOutput', { message: error.message }, true);
    }
});

// Create Product (Admin)
document.getElementById('createProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('prodName').value;
    const description = document.getElementById('prodDescription').value;
    const price = parseFloat(document.getElementById('prodPrice').value);
    const stock = parseInt(document.getElementById('prodStock').value, 10);
    try {
        const data = await callApi('POST', '/products', { name, description, price, stock }, true);
        displayOutput('createProductOutput', data);
    } catch (error) {
        displayOutput('createProductOutput', { message: error.message }, true);
    }
});

// Get All Products (Public/Cached)
document.getElementById('getAllProductsBtn').addEventListener('click', async () => {
    try {
        const data = await callApi('GET', '/products', null, false); // No auth required for public products
        displayOutput('getAllProductsOutput', data);
    } catch (error) {
        displayOutput('getAllProductsOutput', { message: error.message }, true);
    }
});

// Test Rate Limiting
document.getElementById('testRateLimitBtn').addEventListener('click', async () => {
    const outputElement = document.getElementById('rateLimitOutput');
    outputElement.innerHTML = `<p class="success">Sending 100 requests to /health...</p>`;
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < 100; i++) {
        try {
            const response = await fetch('http://localhost:5000/health');
            if (response.ok) {
                successCount++;
            } else {
                const errorData = await response.json();
                console.error(`Request ${i + 1} failed:`, errorData.message);
                failureCount++;
                if (response.status === 429) {
                    outputElement.innerHTML += `<p class="error">Request ${i + 1} blocked by rate limit: ${errorData.message}</p>`;
                }
            }
        } catch (error) {
            console.error(`Request ${i + 1} failed (network error):`, error);
            failureCount++;
            outputElement.innerHTML += `<p class="error">Request ${i + 1} failed (network error): ${error.message}</p>`;
        }
        outputElement.innerHTML = `<p class="success">Sent ${i + 1} requests. Success: ${successCount}, Failed: ${failureCount}</p>`;
        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay to not overwhelm browser/server
    }
    outputElement.innerHTML += `<p class="${failureCount > 0 ? 'error' : 'success'}">Rate limit test complete. Successes: ${successCount}, Failures: ${failureCount}</p>`;
});


// Initial token display on load
updateTokenDisplays();
```