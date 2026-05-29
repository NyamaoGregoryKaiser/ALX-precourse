```javascript
'use strict';
const { PRODUCT_AVAILABILITY } = require('../../api/src/config/constants'); // Adjust path as needed

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('products', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      stock_quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      image_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      weight: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      dimensions: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      availability: {
        type: Sequelize.ENUM(Object.values(PRODUCT_AVAILABILITY)),
        defaultValue: PRODUCT_AVAILABILITY.IN_STOCK,
        allowNull: false,
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: true, // A product can exist without a category
        references: {
          model: 'categories',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL', // If category is deleted, set product's category_id to NULL
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('products', ['category_id']);
    await queryInterface.addIndex('products', ['name']);
    await queryInterface.addIndex('products', ['price']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('products');
  }
};
```