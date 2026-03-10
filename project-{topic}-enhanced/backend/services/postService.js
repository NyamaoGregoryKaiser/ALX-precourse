```javascript
const Post = require('../models/post');
const User = require('../models/user');
const Category = require('../models/category');
const Tag = require('../models/tag');
const ApiError = require('../utils/ApiError');
const { clearCache } = require('../middleware/cache');

/**
 * Create a new post.
 * @param {object} postData - Post details
 * @param {string} authorId - ID of the author
 * @returns {Post} The created post
 */
exports.createPost = async (postData, authorId) => {
  const { title, content, categoryId, tags, status, featuredImage } = postData;

  if (!title || !content || !authorId) {
    throw new ApiError(400, 'Title, content, and author are required.');
  }

  const post = await Post.create({
    title,
    content,
    authorId,
    categoryId,
    status,
    featuredImage,
  });

  if (tags && tags.length > 0) {
    const tagInstances = await Promise.all(
      tags.map(async (tagName) => {
        const [tag] = await Tag.findOrCreate({
          where: { name: tagName.toLowerCase() },
          defaults: { name: tagName.toLowerCase() }
        });
        return tag;
      })
    );
    await post.addTags(tagInstances);
  }
  await clearCache('posts:*'); // Clear post-related cache
  return post;
};

/**
 * Get all posts.
 * @param {object} queryOptions - Options for filtering, pagination, sorting
 * @returns {array} List of posts
 */
exports.getAllPosts = async (queryOptions) => {
  const { limit = 10, offset = 0, status, categoryId, authorId, search, sort = 'createdAt:desc' } = queryOptions;

  const where = {};
  if (status) where.status = status;
  if (categoryId) where.categoryId = categoryId;
  if (authorId) where.authorId = authorId;
  if (search) {
    where.title = { [Post.sequelize.Op.iLike]: `%${search}%` };
  }

  const order = [];
  const [field, direction] = sort.split(':');
  order.push([field, direction.toUpperCase()]);

  const posts = await Post.findAndCountAll({
    where,
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    order,
    include: [
      { model: User, as: 'author', attributes: ['id', 'username', 'email'] },
      { model: Category, as: 'category', attributes: ['id', 'name'] },
      { model: Tag, as: 'tags', attributes: ['id', 'name'], through: { attributes: [] } } // Exclude PostTag attributes
    ]
  });
  return posts;
};

/**
 * Get a single post by ID or slug.
 * @param {string} identifier - Post ID or slug
 * @returns {Post} The post object
 */
exports.getPostByIdOrSlug = async (identifier) => {
  const post = await Post.findOne({
    where: {
      [Post.sequelize.Op.or]: [
        { id: identifier },
        { slug: identifier }
      ]
    },
    include: [
      { model: User, as: 'author', attributes: ['id', 'username', 'email'] },
      { model: Category, as: 'category', attributes: ['id', 'name'] },
      { model: Tag, as: 'tags', attributes: ['id', 'name'], through: { attributes: [] } }
    ]
  });

  if (!post) {
    throw new ApiError(404, `Post with identifier '${identifier}' not found`);
  }
  return post;
};

/**
 * Update an existing post.
 * @param {string} id - Post ID
 * @param {object} updateData - Data to update
 * @returns {Post} The updated post
 */
exports.updatePost = async (id, updateData) => {
  const post = await Post.findByPk(id);
  if (!post) {
    throw new ApiError(404, `Post with id ${id} not found`);
  }

  // Handle tags update separately
  if (updateData.tags !== undefined) {
    const newTags = updateData.tags || [];
    const tagInstances = await Promise.all(
      newTags.map(async (tagName) => {
        const [tag] = await Tag.findOrCreate({
          where: { name: tagName.toLowerCase() },
          defaults: { name: tagName.toLowerCase() }
        });
        return tag;
      })
    );
    await post.setTags(tagInstances); // Removes existing associations and adds new ones
    delete updateData.tags; // Remove from updateData to prevent sequelize from trying to update directly
  }

  await post.update(updateData);
  await clearCache('posts:*'); // Clear post-related cache
  return post;
};

/**
 * Delete a post.
 * @param {string} id - Post ID
 * @returns {number} Number of deleted rows (1 if successful, 0 otherwise)
 */
exports.deletePost = async (id) => {
  const deletedRows = await Post.destroy({ where: { id } });
  if (deletedRows === 0) {
    throw new ApiError(404, `Post with id ${id} not found`);
  }
  await clearCache('posts:*'); // Clear post-related cache
  return deletedRows;
};
```