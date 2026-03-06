```javascript
import axios from 'axios';
import config from '../config';

const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const tokens = JSON.parse(localStorage.getItem('tokens'));
    if (tokens && tokens.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Check for 401 and if it's not a refresh token request itself
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const tokens = JSON.parse(localStorage.getItem('tokens'));
        if (!tokens || !tokens.refreshToken?.token) {
            // No refresh token, or malformed tokens, force logout
            console.error("No refresh token available, forcing logout.");
            localStorage.removeItem('user');
            localStorage.removeItem('tokens');
            window.location.href = '/'; // Redirect to login/home
            return Promise.reject(error);
        }

        const refreshToken = tokens.refreshToken.token;
        const response = await axios.post(`${config.apiBaseUrl}/auth/refresh-token`, { refreshToken });

        const newTokens = response.data.tokens;
        const newUser = response.data.user;

        localStorage.setItem('tokens', JSON.stringify(newTokens));
        localStorage.setItem('user', JSON.stringify(newUser));

        // Update the authorization header for the original request
        originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken.token}`;
        return apiClient(originalRequest); // Retry the original request with the new token
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // If refresh fails, clear tokens and redirect to login
        localStorage.removeItem('user');
        localStorage.removeItem('tokens');
        window.location.href = '/'; // Redirect to login/home
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```