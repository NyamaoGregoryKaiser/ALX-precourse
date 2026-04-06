```typescript
import { PrismaClient, UserRole, TransactionType, TransactionStatus, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Hash passwords
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const userPassword = await bcrypt.hash('User@1234', 10);

  // Create Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
    },
  });
  console.log(`Created admin user with ID: ${adminUser.id}`);

  // Create Regular User 1
  const user1 = await prisma.user.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      email: 'john.doe@example.com',
      password: userPassword,
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.USER,
    },
  });
  console.log(`Created user 1 with ID: ${user1.id}`);

  // Create Regular User 2
  const user2 = await prisma.user.upsert({
    where: { email: 'jane.smith@example.com' },
    update: {},
    create: {
      email: 'jane.smith@example.com',
      password: userPassword,
      firstName: 'Jane',
      lastName: 'Smith',
      role: UserRole.USER,
    },
  });
  console.log(`Created user 2 with ID: ${user2.id}`);

  // Create Accounts for Users
  const account1 = await prisma.account.upsert({
    where: { accountNumber: '1000000001' },
    update: {},
    create: {
      userId: user1.id,
      accountNumber: '1000000001',
      balance: 1000.00,
      currency: 'USD',
    },
  });
  console.log(`Created account for John Doe: ${account1.accountNumber}`);

  const account2 = await prisma.account.upsert({
    where: { accountNumber: '1000000002' },
    update: {},
    create: {
      userId: user2.id,
      accountNumber: '1000000002',
      balance: 500.00,
      currency: 'USD',
    },
  });
  console.log(`Created account for Jane Smith: ${account2.accountNumber}`);

  const account3 = await prisma.account.upsert({
    where: { accountNumber: '2000000001' }, // Another account for John Doe
    update: {},
    create: {
      userId: user1.id,
      accountNumber: '2000000001',
      balance: 200.00,
      currency: 'EUR',
    },
  });
  console.log(`Created second account for John Doe: ${account3.accountNumber}`);


  // Create some initial transactions/payments
  // Simulate a transfer from user1 to user2
  const transferAmount = 150.00;
  const description = 'Initial seed transfer';
  const idempotencyKey = 'seed-transfer-12345';

  const payment = await prisma.payment.create({
    data: {
      sourceAccountId: account1.id,
      destinationAccountId: account2.id,
      amount: transferAmount,
      currency: 'USD',
      description,
      status: PaymentStatus.COMPLETED,
      idempotencyKey: idempotencyKey,
      provider: 'INTERNAL',
      transaction: {
        create: {
          sourceAccountId: account1.id,
          destinationAccountId: account2.id,
          amount: transferAmount,
          currency: 'USD',
          type: TransactionType.TRANSFER,
          status: TransactionStatus.COMPLETED,
          description,
          idempotencyKey: idempotencyKey,
        }
      }
    }
  });

  // Update account balances as if the transaction happened
  await prisma.account.update({
    where: { id: account1.id },
    data: { balance: { decrement: transferAmount } },
  });

  await prisma.account.update({
    where: { id: account2.id },
    data: { balance: { increment: transferAmount } },
  });

  console.log(`Simulated payment and transaction with ID: ${payment.id}`);
  console.log(`Account ${account1.accountNumber} new balance: ${account1.balance - transferAmount}`);
  console.log(`Account ${account2.accountNumber} new balance: ${account2.balance + transferAmount}`);


  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```