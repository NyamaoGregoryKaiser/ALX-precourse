```javascript
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const knex = require('knex')(require('./knexfile')[process.env.NODE_ENV || 'development']);

// Middleware (example)
app.use(express.json());


// Example API route (requires significant expansion for CRUD)
app.get('/users', async (req, res) => {
    try {
        const users = await knex('users').select('*');
        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});


app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

```