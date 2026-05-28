```javascript
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
    const Review = sequelize.define('Review', {
        id: {
            type: DataTypes.UUID,
            defaultValue: () => uuidv4(),
            primaryKey: true,
            allowNull: false,
            unique: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        productId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'products',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        rating: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: {
                    args: [1],
                    msg: 'Rating must be at least 1 star.'
                },
                max: {
                    args: [5],
                    msg: 'Rating cannot be more than 5 stars.'
                }
            }
        },
        comment: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'reviews',
        timestamps: true,
        uniqueKeys: {
            user_product_review_unique: {
                fields: ['userId', 'productId'] // One review per user per product
            }
        }
    });

    Review.associate = (models) => {
        Review.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
        Review.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
    };

    return Review;
};
```