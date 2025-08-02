```javascript
const { pool } = require('../database/db');
const asyncHandler = require('express-async-handler');

// ...Implement CRUD operations using pool.query()...  Example for GET all users:
const getUsers = asyncHandler(async (req, res) => {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
});
//Implement remaining CRUD operations similarly

module.exports = {createUser, getUsers, getUserById, updateUser, deleteUser};
```