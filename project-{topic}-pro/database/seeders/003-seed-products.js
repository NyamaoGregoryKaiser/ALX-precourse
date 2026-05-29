```javascript
'use strict';
const { v4: uuidv4 } = require('uuid');
const { PRODUCT_AVAILABILITY } = require('../../api/src/config/constants');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const categories = await queryInterface.sequelize.query(
      `SELECT id, name from categories;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const electronicsCategory = categories.find(cat => cat.name === 'Electronics');
    const booksCategory = categories.find(cat => cat.name === 'Books');
    const apparelCategory = categories.find(cat => cat.name === 'Apparel');

    const products = [
      {
        id: uuidv4(),
        name: 'Wireless Bluetooth Headphones',
        description: 'High-quality sound with comfortable design and long battery life.',
        price: 99.99,
        stock_quantity: 50,
        image_url: 'https://example.com/headphones.jpg',
        weight: 0.25,
        dimensions: { length: 20, width: 15, height: 8, unit: 'cm' },
        availability: PRODUCT_AVAILABILITY.IN_STOCK,
        category_id: electronicsCategory ? electronicsCategory.id : null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Gaming Laptop RTX 3080',
        description: 'Powerful gaming laptop with NVIDIA RTX 3080 graphics card and 16GB RAM.',
        price: 1899.00,
        stock_quantity: 10,
        image_url: 'https://example.com/gaming_laptop.jpg',
        weight: 2.5,
        dimensions: { length: 35, width: 25, height: 2.5, unit: 'cm' },
        availability: PRODUCT_AVAILABILITY.IN_STOCK,
        category_id: electronicsCategory ? electronicsCategory.id : null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        name: 'The Great Gatsby',
        description: 'A classic novel by F. Scott Fitzgerald.',
        price: 12.50,
        stock_quantity: 100,
        image_url: 'https://example.com/great_gatsby.jpg',
        weight: 0.3,
        dimensions: { length: 20, width: 13, height: 2, unit: 'cm' },
        availability: PRODUCT_AVAILABILITY.IN_STOCK,
        category_id: booksCategory ? booksCategory.id : null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Men\'s Casual T-Shirt',
        description: 'Comfortable cotton t-shirt for everyday wear.',
        price: 25.00,
        stock_quantity: 200,
        image_url: 'https://example.com/tshirt.jpg',
        weight: 0.15,
        dimensions: { length: 30, width: 25, height: 1, unit: 'cm' },
        availability: PRODUCT_AVAILABILITY.IN_STOCK,
        category_id: apparelCategory ? apparelCategory.id : null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Smartwatch Series 7',
        description: 'Advanced smartwatch with health tracking and notifications.',
        price: 399.00,
        stock_quantity: 0, // Example of out of stock
        image_url: 'https://example.com/smartwatch.jpg',
        weight: 0.1,
        dimensions: { length: 5, width: 4, height: 1.2, unit: 'cm' },
        availability: PRODUCT_AVAILABILITY.OUT_OF_STOCK,
        category_id: electronicsCategory ? electronicsCategory.id : null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    await queryInterface.bulkInsert('products', products, {});
    console.log('Products seeded successfully.');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('products', null, {});
  }
};
```