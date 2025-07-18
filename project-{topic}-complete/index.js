```javascript
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const db = require('./db'); // Database connection
const routes = require('./routes'); // API routes
const errorHandler = require('./middleware/errorHandler'); // Custom error handler
const authMiddleware = require('./middleware/authMiddleware'); // Authentication middleware
const rateLimit = require('express-rate-limit');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors()); // Enable CORS
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })); // Rate limiting

//Database connection
db.connect();

// Routes
app.use('/api', routes);

// Error handling
app.use(errorHandler);


app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

```