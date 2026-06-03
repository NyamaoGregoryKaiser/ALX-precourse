```javascript
const { hashPassword } = require('../src/utils/crypt');
const { v4: uuidv4 } = require('uuid');

exports.seed = async function(knex) {
  // Clear existing data
  await knex('webhook_logs').del();
  await knex('transactions').del();
  await knex('payment_methods').del();
  await knex('merchants').del();
  await knex('users').del();

  const hashedPassword = await hashPassword('password123');

  // Create Users
  const users = [
    {
      id: uuidv4(),
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: hashedPassword,
      type: 'user',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: uuidv4(),
      name: 'Jane Smith',
      email: 'jane.smith@merchant.com',
      password: hashedPassword,
      type: 'merchant',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: uuidv4(),
      name: 'Admin User',
      email: 'admin@example.com',
      password: hashedPassword,
      type: 'admin',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];
  await knex('users').insert(users);

  // Create Merchants and link to merchant user
  const janeSmithUser = users.find(u => u.email === 'jane.smith@merchant.com');
  const merchants = [
    {
      id: uuidv4(),
      user_id: janeSmithUser.id,
      name: "Jane's Fashion Boutique",
      description: 'Online store for trendy clothes.',
      webhook_url: 'http://localhost:3000/api/v1/mock-merchant-webhook', // Example mock webhook endpoint
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];
  await knex('merchants').insert(merchants);

  // Update merchant_id for merchant user
  await knex('users').where({ id: janeSmithUser.id }).update({ merchant_id: merchants[0].id });

  // Example: Add a payment method for John Doe (for testing purposes, real-world card data never stored)
  // const johnDoeUser = users.find(u => u.email === 'john.doe@example.com');
  // const { encrypt } = require('../src/utils/crypt'); // Ensure you have an encryption key set in .env
  // if (process.env.ENCRYPTION_KEY) {
  //   await knex('payment_methods').insert({
  //     id: uuidv4(),
  //     user_id: johnDoeUser.id,
  //     type: 'card',
  //     card_holder_name: encrypt('John Doe'),
  //     card_number: encrypt('4242424242420001'), // Mock card number
  //     expiry_month: encrypt('12'),
  //     expiry_year: encrypt('2025'),
  //     card_brand: 'Visa',
  //     fingerprint: uuidv4(), // In real, this is from gateway
  //     is_default: true,
  //     status: 'active',
  //     created_at: new Date(),
  //     updated_at: new Date(),
  //   });
  // }
};
```