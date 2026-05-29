```javascript
'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const categories = [
      { id: uuidv4(), name: 'Electronics', description: 'Gadgets and electronic devices.', image_url: 'https://example.com/electronics.jpg', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Books', description: 'Various genres of books.', image_url: 'https://example.com/books.jpg', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Apparel', description: 'Clothing for men, women, and children.', image_url: 'https://example.com/apparel.jpg', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Home & Kitchen', description: 'Appliances and decor for your home.', image_url: 'https://example.com/homekitchen.jpg', created_at: new Date(), updated_at: new Date() },
    ];
    await queryInterface.bulkInsert('categories', categories, {});
    console.log('Categories seeded successfully.');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('categories', null, {});
  }
};
```