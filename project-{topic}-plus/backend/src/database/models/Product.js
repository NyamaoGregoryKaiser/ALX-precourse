```javascript
module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // Product names should be unique
      validate: {
        notEmpty: { msg: 'Product name cannot be empty.' },
        len: { args: [3, 100], msg: 'Product name must be between 3 and 100 characters.' }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        isDecimal: { msg: 'Price must be a valid decimal number.' },
        min: { args: [0], msg: 'Price cannot be negative.' }
      }
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isInt: { msg: 'Stock must be an integer.' },
        min: { args: [0], msg: 'Stock cannot be negative.' }
      }
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: { args: [2, 50], msg: 'Category must be between 2 and 50 characters.' }
      }
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isURL: { msg: 'Must be a valid URL for image.' }
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true, // A product can exist without an associated user if user is deleted (SET NULL)
      references: {
        model: 'users', // Name of the target table
        key: 'id',     // Key in the target table that we're referencing
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    }
  }, {
    tableName: 'products',
    timestamps: true,
    paranoid: true // Enable soft deletes
  });

  Product.associate = (models) => {
    Product.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'owner'
    });
  };

  return Product;
};
```