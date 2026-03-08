```javascript
'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');
const { USER_ROLES, ACCOUNT_TYPE } = require('../src/utils/constants');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const adminUserId = uuidv4();
    const normalUserId = uuidv4();

    // Hash passwords
    const adminPasswordHash = await bcrypt.hash(config.admin.password, 10);
    const normalUserPasswordHash = await bcrypt.hash('password123', 10);

    // Create users
    await queryInterface.bulkInsert('users', [
      {
        id: adminUserId,
        name: 'Admin User',
        email: config.admin.email,
        password: adminPasswordHash,
        role: USER_ROLES.ADMIN,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: normalUserId,
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: normalUserPasswordHash,
        role: USER_ROLES.USER,
        created_at: new Date(),
        updated_at: new Date(),
      }
    ], {});

    // Create accounts for users
    const adminAccount1Id = uuidv4();
    const adminAccount2Id = uuidv4();
    const normalUserAccount1Id = uuidv4();
    const normalUserAccount2Id = uuidv4();

    await queryInterface.bulkInsert('accounts', [
      {
        id: adminAccount1Id,
        user_id: adminUserId,
        name: 'Admin Checking',
        type: ACCOUNT_TYPE.CHECKING,
        currency: 'USD',
        balance: 10000.00,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: adminAccount2Id,
        user_id: adminUserId,
        name: 'Admin Savings',
        type: ACCOUNT_TYPE.SAVINGS,
        currency: 'USD',
        balance: 50000.00,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: normalUserAccount1Id,
        user_id: normalUserId,
        name: 'John\'s Checking',
        type: ACCOUNT_TYPE.CHECKING,
        currency: 'USD',
        balance: 1500.00,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: normalUserAccount2Id,
        user_id: normalUserId,
        name: 'John\'s Savings',
        type: ACCOUNT_TYPE.SAVINGS,
        currency: 'USD',
        balance: 3000.00,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }
    ], {});

    // Example transaction (initially, balance adjustments happen in service,
    // so seeding transactions directly isn't typical for initial state but for historical data)
    // For this seed, we assume these accounts are already set up with balances.
    // Real transactions would be created via the API.
    await queryInterface.bulkInsert('transactions', [
      // Example: Admin transfers 500 from Checking to Savings (manual transaction, not API-driven)
      // This is for demonstrating data presence, not flow.
      {
        id: uuidv4(),
        user_id: adminUserId,
        source_account_id: adminAccount1Id,
        destination_account_id: adminAccount2Id,
        amount: 500.00,
        currency: 'USD',
        description: 'Initial seed transfer from checking to savings for admin',
        status: 'completed',
        type: 'transfer',
        created_at: new Date(),
        updated_at: new Date(),
        completed_at: new Date(),
      },
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('transactions', null, {});
    await queryInterface.bulkDelete('accounts', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};
```