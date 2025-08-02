```javascript
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { pool } = require('./database/db'); // PostgreSQL connection pool
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const rateLimit = require('rate-limit');

const app = express();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  delayMs: 0 // disable delaying - hard limit
});

app.use(cors());
app.use(bodyParser.json());
app.use(limiter); // apply rate limiting
app.use('/api', routes); // API routes
app.use(errorHandler);


// ...Authentication middleware (JWT) goes here...

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));

```