```javascript
module.exports = (sequelize, DataTypes) => {
  const Post = sequelize.define('Post', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [5, 255],
          msg: 'Title must be between 5 and 255 characters',
        },
      },
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        is: {
          args: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
          msg: 'Slug must be in kebab-case format (e.g., "my-awesome-post")',
        },
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    excerpt: {
      type: DataTypes.STRING(500), // Shorter summary for listings
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      defaultValue: 'draft',
      allowNull: false,
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    featuredImage: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true, // A post can exist without a category initially
      references: {
        model: 'categories',
        key: 'id',
      },
    },
  }, {
    tableName: 'posts',
    timestamps: true,
    hooks: {
      beforeValidate: (post) => {
        if (post.title && !post.slug) {
          post.slug = post.title.toLowerCase()
                                 .replace(/[^a-z0-9\s-]/g, '')
                                 .trim()
                                 .replace(/\s+/g, '-');
        }
        if (post.status === 'published' && !post.publishedAt) {
          post.publishedAt = new Date();
        } else if (post.status !== 'published' && post.publishedAt) {
          // If status changes from published, clear publishedAt
          post.publishedAt = null;
        }
      }
    },
    indexes: [
      {
        unique: true,
        fields: ['slug'],
      },
      {
        fields: ['authorId'],
      },
      {
        fields: ['categoryId'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['publishedAt'],
      },
    ]
  });

  Post.associate = (models) => {
    Post.belongsTo(models.User, {
      foreignKey: 'authorId',
      as: 'author',
    });
    Post.belongsTo(models.Category, {
      foreignKey: 'categoryId',
      as: 'category',
    });
  };

  return Post;
};
```