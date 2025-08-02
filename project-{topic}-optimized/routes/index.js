```javascript
const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes'); //Example Route

router.use('/users', userRoutes); // Example route

module.exports = router;
```