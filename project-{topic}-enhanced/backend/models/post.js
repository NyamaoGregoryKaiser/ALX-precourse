```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user');
const Category = require('./category');
const Tag = require('./tag');

const Post = sequelize.define('Post', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [5, 255]
    }
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      is: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, // lowercase, numbers, hyphens only
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
    }
  },
  excerpt: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    defaultValue: 'draft',
    allowNull: false,
  },
  featuredImage: {
    type: DataTypes.STRING, // URL to the image
    allowNull: true,
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: true,
  hooks: {
    beforeValidate: (post, options) => {
      if (post.title && !post.slug) {
        post.slug = post.title.toLowerCase()
                             .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric chars except space and hyphen
                             .replace(/\s+/g, '-')        // Replace spaces with hyphens
                             .replace(/-+/g, '-');        // Replace multiple hyphens with single hyphen
      }
      if (post.status === 'published' && !post.publishedAt) {
        post.publishedAt = new Date();
      } else if (post.status !== 'published' && post.publishedAt) {
        post.publishedAt = null; // Clear publishedAt if not published
      }
      if (!post.excerpt && post.content) {
        post.excerpt = post.content.substring(0, Math.min(500, post.content.length)).trim() + (post.content.length > 500 ? '...' : '');
      }
    }
  }
});

// Associations
Post.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
Post.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

// Many-to-Many for Posts and Tags
const PostTag = sequelize.define('PostTag', {}, { timestamps: false });
Post.belongsToMany(Tag, { through: PostTag, foreignKey: 'postId', as: 'tags' });
Tag.belongsToMany(Post, { through: PostTag, foreignKey: 'tagId', as: 'posts' });

module.exports = Post;
```