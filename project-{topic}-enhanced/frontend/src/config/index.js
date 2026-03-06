```javascript
const config = {
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api',
  socketIoUrl: process.env.REACT_APP_SOCKET_IO_URL || 'http://localhost:5000',
};

export default config;
```