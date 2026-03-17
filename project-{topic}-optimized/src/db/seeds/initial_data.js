const bcrypt = require('bcryptjs');
const { generateUUID } = require('../../utils/helpers'); // Assuming helper to generate UUIDs

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Clear existing data
  await knex('transactions').del();
  await knex('accounts').del();
  await knex('users').del();

  const hashedPasswordAdmin = await bcrypt.hash('adminpassword', 10);
  const hashedPasswordUser = await bcrypt.hash('userpassword', 10);

  // Insert users
  const [adminUser] = await knex('users').insert({
    id: generateUUID(),
    username: 'Admin User',
    email: 'admin@example.com',
    password: hashedPasswordAdmin,
    role: 'admin',
  }).returning('id');

  const [regularUser1] = await knex('users').insert({
    id: generateUUID(),
    username: 'John Doe',
    email: 'john.doe@example.com',
    password: hashedPasswordUser,
    role: 'user',
  }).returning('id');

  const [regularUser2] = await knex('users').insert({
    id: generateUUID(),
    username: 'Jane Smith',
    email: 'jane.smith@example.com',
    password: hashedPasswordUser,
    role: 'user',
  }).returning('id');

  console.log('Users seeded successfully.');

  // Insert accounts
  const [adminAccountUSD] = await knex('accounts').insert({
    id: generateUUID(),
    user_id: adminUser.id,
    currency: 'USD',
    balance: 100000.00, // Large balance for admin testing
  }).returning('id');

  const [johnAccountUSD] = await knex('accounts').insert({
    id: generateUUID(),
    user_id: regularUser1.id,
    currency: 'USD',
    balance: 5000.00,
  }).returning('id');

  const [johnAccountEUR] = await knex('accounts').insert({
    id: generateUUID(),
    user_id: regularUser1.id,
    currency: 'EUR',
    balance: 2000.00,
  }).returning('id');

  const [janeAccountUSD] = await knex('accounts').insert({
    id: generateUUID(),
    user_id: regularUser2.id,
    currency: 'USD',
    balance: 7500.00,
  }).returning('id');

  console.log('Accounts seeded successfully.');

  // Insert some initial transactions
  await knex('transactions').insert([
    {
      id: generateUUID(),
      account_id: johnAccountUSD.id,
      type: 'credit',
      amount: 1000.00,
      currency: 'USD',
      status: 'completed',
      description: 'Initial deposit',
    },
    {
      id: generateUUID(),
      account_id: johnAccountUSD.id,
      type: 'debit',
      amount: 250.00,
      currency: 'USD',
      status: 'completed',
      description: 'Online purchase',
      reference_id: generateUUID(), // Example reference
    },
    {
      id: generateUUID(),
      account_id: janeAccountUSD.id,
      type: 'credit',
      amount: 500.00,
      currency: 'USD',
      status: 'completed',
      description: 'Freelance payment',
    },
  ]);

  console.log('Transactions seeded successfully.');
};