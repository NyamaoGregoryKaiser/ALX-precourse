```javascript
const asyncHandler = require('express-async-handler');
const Post = require('../models/Post');
// ...other imports for authentication and validation

const createPost = asyncHandler(async (req, res) => {
  // ... Authentication and validation middleware here ...
  const { title, content } = req.body;
  const newPost = await Post.create({ title, content, userId: req.user.id });
  res.status(201).json(newPost);
});

// ... other CRUD operations (read, update, delete) with similar structure ...
module.exports = { createPost, ... };
```