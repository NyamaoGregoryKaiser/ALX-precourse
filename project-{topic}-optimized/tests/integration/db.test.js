// Ensure `tests/setup.js` runs before this file to initialize `global.db`

describe('Database Integration Tests', () => {
  test('should connect to the test database', async () => {
    // Perform a simple query to check connectivity
    const result = await global.db.raw('SELECT 1+1 AS result');
    expect(result.rows[0].result).toBe(2);
  });

  test('users table should exist and be seeded', async () => {
    const users = await global.db('users').select('*');
    expect(users.length).toBeGreaterThan(0); // Should have data from seeds
    const adminUser = users.find(u => u.email === 'admin@example.com');
    expect(adminUser).toBeDefined();
    expect(adminUser.role).toBe('admin');
  });

  test('accounts table should exist and be seeded', async () => {
    const accounts = await global.db('accounts').select('*');
    expect(accounts.length).toBeGreaterThan(0); // Should have data from seeds
    const johnDoeAccount = accounts.find(a => a.currency === 'USD' && a.balance === 5000.00);
    expect(johnDoeAccount).toBeDefined();
  });

  test('transactions table should exist and be seeded', async () => {
    const transactions = await global.db('transactions').select('*');
    expect(transactions.length).toBeGreaterThan(0); // Should have data from seeds
    const initialDeposit = transactions.find(t => t.description === 'Initial deposit');
    expect(initialDeposit).toBeDefined();
    expect(initialDeposit.status).toBe('completed');
  });

  test('should enforce unique email for users', async () => {
    const existingUser = await global.db('users').first();
    await expect(
      global.db('users').insert({
        username: 'Duplicate User',
        email: existingUser.email, // Use existing email
        password: 'anypassword',
        role: 'user',
      })
    ).rejects.toThrow(/duplicate key value violates unique constraint "users_email_unique"/);
  });

  test('should enforce unique account per user per currency', async () => {
    const userWithAccount = await global.db('users').where({ email: 'john.doe@example.com' }).first();
    const existingAccount = await global.db('accounts').where({ user_id: userWithAccount.id }).first();

    await expect(
      global.db('accounts').insert({
        id: '99999999-9999-4999-9999-999999999999', // New UUID for account
        user_id: userWithAccount.id,
        currency: existingAccount.currency, // Existing currency for this user
        balance: 100.00,
      })
    ).rejects.toThrow(/duplicate key value violates unique constraint "accounts_user_id_currency_unique"/);
  });
});