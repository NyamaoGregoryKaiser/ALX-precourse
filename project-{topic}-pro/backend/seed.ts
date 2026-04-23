import 'reflect-metadata';
import AppDataSource from './ormconfig';
import { User, UserRole } from './src/entities/User';
import { Merchant } from './src/entities/Merchant';
import { Account, AccountType } from './src/entities/Account';
import bcrypt from 'bcryptjs';
import { config } from './src/config';
import logger from './src/utils/logger';
import { v4 as uuidv4 } from 'uuid';

const seed = async () => {
  await AppDataSource.initialize();
  logger.info('Database connected for seeding...');

  try {
    // Clear existing data (optional, use with caution in production)
    await AppDataSource.manager.clear(WebhookEvent);
    await AppDataSource.manager.clear(Transaction);
    await AppDataSource.manager.clear(Payment);
    await AppDataSource.manager.clear(Account);
    await AppDataSource.manager.clear(Merchant);
    await AppDataSource.manager.clear(User);
    logger.info('Cleared existing data.');

    const passwordHash = await bcrypt.hash('password123', config.hashSaltRounds);

    // Create Admin User
    const adminUser = AppDataSource.manager.create(User, {
      email: 'admin@alxpay.com',
      passwordHash,
      role: UserRole.ADMIN,
      isEmailVerified: true,
    });
    await AppDataSource.manager.save(adminUser);
    logger.info('Admin user created.');

    // Create Merchant User
    const merchantUser = AppDataSource.manager.create(User, {
      email: 'merchant@alxpay.com',
      passwordHash,
      role: UserRole.MERCHANT,
      isEmailVerified: true,
    });
    await AppDataSource.manager.save(merchantUser);
    logger.info('Merchant user created.');

    // Create a Merchant linked to the Merchant User
    const alxStoreMerchant = AppDataSource.manager.create(Merchant, {
      name: 'ALX Store',
      businessAddress: '123 Tech Lane, Silicon Valley',
      publicKey: uuidv4(), // Generate a unique API key
      secretKey: uuidv4(), // Generate a unique secret key
      balance: 1500.75,
      owner: merchantUser,
    });
    await AppDataSource.manager.save(alxStoreMerchant);
    logger.info('ALX Store merchant created.');

    // Create Regular User
    const regularUser = AppDataSource.manager.create(User, {
      email: 'user@alxpay.com',
      passwordHash,
      role: UserRole.USER,
      isEmailVerified: true,
    });
    await AppDataSource.manager.save(regularUser);
    logger.info('Regular user created.');

    // Create Accounts for Users
    const merchantAccount = AppDataSource.manager.create(Account, {
      user: merchantUser,
      balance: 10000.00,
      accountType: AccountType.MERCHANT_WALLET,
      currency: 'USD',
    });
    await AppDataSource.manager.save(merchantAccount);
    logger.info('Merchant account created.');

    const userCheckingAccount = AppDataSource.manager.create(Account, {
      user: regularUser,
      balance: 500.50,
      accountType: AccountType.CHECKING,
      currency: 'USD',
    });
    await AppDataSource.manager.save(userCheckingAccount);
    logger.info('User checking account created.');


    logger.info('Seeding complete!');
  } catch (error) {
    logger.error('Seeding failed:', error);
  } finally {
    await AppDataSource.destroy();
    logger.info('Database connection closed.');
  }
};

seed();