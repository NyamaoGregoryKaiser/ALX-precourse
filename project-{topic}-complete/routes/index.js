```javascript
const express = require('express');
const router = express.Router();
const userRoutes = require('./users');
const productRoutes = require('./products'); //Example route

router.use('/users', userRoutes);
router.use('/products', productRoutes); //Example route

module.exports = router;
```