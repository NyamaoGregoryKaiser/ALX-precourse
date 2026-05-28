```javascript
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
    const Category = sequelize.define('Category', {
        id: {
            type: DataTypes.UUID,
            defaultValue: () => uuidv4(),
            primaryKey: true,
            allowNull: false,
            unique: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                len: {
                    args: [2, 50],
                    msg: 'Category name must be between 2 and 50 characters.'
                }
            }
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'categories',
        timestamps: true
    });

    Category.associate = (models) => {
        Category.hasMany(models.Product, { foreignKey: 'categoryId', as: 'products' });
    };

    return Category;
};
```