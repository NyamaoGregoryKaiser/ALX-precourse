```javascript
'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const adminUserId = uuidv4();
    const normalUserId = uuidv4();

    const hashedPasswordAdmin = await bcrypt.hash('admin123', 10);
    const hashedPasswordUser = await bcrypt.hash('user123', 10);

    await queryInterface.bulkInsert('users', [
      {
        id: adminUserId,
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPasswordAdmin,
        role: 'admin',
        isActivated: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: normalUserId,
        username: 'testuser',
        email: 'user@example.com',
        password: hashedPasswordUser,
        role: 'user',
        isActivated: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ], {});

    await queryInterface.bulkInsert('products', [
      {
        id: uuidv4(),
        name: 'Laptop Pro X',
        description: 'High-performance laptop for professionals.',
        price: 1200.00,
        stock: 50,
        category: 'Electronics',
        imageUrl: 'https://via.placeholder.com/150/0000FF/FFFFFF?text=Laptop',
        userId: adminUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Mechanical Keyboard RGB',
        description: 'Gaming mechanical keyboard with customizable RGB lighting.',
        price: 99.99,
        stock: 200,
        category: 'Accessories',
        imageUrl: 'https://via.placeholder.com/150/FF0000/FFFFFF?text=Keyboard',
        userId: adminUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Wireless Mouse Ergonomic',
        description: 'Ergonomic wireless mouse for comfort.',
        price: 29.50,
        stock: 150,
        category: 'Accessories',
        imageUrl: 'https://via.placeholder.com/150/00FF00/FFFFFF?text=Mouse',
        userId: normalUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Monitor UltraWide 4K',
        description: 'Immersive ultrawide monitor with 4K resolution.',
        price: 650.00,
        stock: 30,
        category: 'Electronics',
        imageUrl: 'https://via.placeholder.com/150/00FFFF/FFFFFF?text=Monitor',
        userId: normalUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('products', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};
```