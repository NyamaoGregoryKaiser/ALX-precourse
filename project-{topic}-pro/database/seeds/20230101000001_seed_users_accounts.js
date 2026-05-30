const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('transactions').del();
  await knex('payment_methods').del();
  await knex('accounts').del();
  await knex('users').del();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Insert users
  const [user1] = await knex('users').insert([
    {
      id: uuidv4(),
      email: 'john.doe@example.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Doe',
      role: 'user',
    },
    {
      id: uuidv4(),
      email: 'jane.smith@example.com',
      password: hashedPassword,
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'user',
    },
    {
      id: uuidv4(),
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    },
  ]).returning('*'); // Get the inserted users

  // Insert accounts for user1
  const [account1] = await knex('accounts').insert([
    {
      id: uuidv4(),
      userId: user1.id,
      accountNumber: 'NGN-1000000001',
      balance: 150000.00,
      currency: 'NGN',
    },
    {
      id: uuidv4(),
      userId: user1.id,
      accountNumber: 'USD-1000000002',
      balance: 500.00,
      currency: 'USD',
    },
  ]).returning('*');

  // Insert a sample transaction
  await knex('transactions').insert([
    {
      id: uuidv4(),
      userId: user1.id,
      accountId: account1.id,
      reference: `TRX-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      amount: 5000.00,
      currency: 'NGN',
      type: 'debit',
      status: 'completed',
      description: 'Initial test purchase',
    },
  ]);

  console.log('Seed data inserted successfully.');
};