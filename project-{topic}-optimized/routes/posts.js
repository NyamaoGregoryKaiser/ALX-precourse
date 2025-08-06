```javascript
const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

// ... (CRUD operations for posts - GET, POST, PUT, DELETE) ...
router.get('/', async (req, res) => {
    try {
      const posts = await Post.find();
      res.json(posts);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

// ... (rest of the routes) ...

module.exports = router;
```