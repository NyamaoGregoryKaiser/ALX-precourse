```javascript
module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: {
          args: [2, 50],
          msg: 'Category name must be between 2 and 50 characters',
        },
      },
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        is: {
          args: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, // slug format (kebab-case)
          msg: 'Slug must be in kebab-case format (e.g., "my-category-slug")',
        },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'categories',
    timestamps: true,
    hooks: {
      beforeValidate: (category) => {
        if (category.name && !category.slug) {
          category.slug = category.name.toLowerCase()
                                      .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric chars except spaces and hyphens
                                      .trim()
                                      .replace(/\s+/g, '-');      // Replace spaces with hyphens
        }
      }
    }
  });

  Category.associate = (models) => {
    Category.hasMany(models.Post, {
      foreignKey: 'categoryId',
      as: 'posts',
      onDelete: 'SET NULL', // Posts can exist without a category
    });
  };

  return Category;
};
```