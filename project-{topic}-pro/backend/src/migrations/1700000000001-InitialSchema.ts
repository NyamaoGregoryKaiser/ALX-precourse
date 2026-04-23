import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class InitialSchema1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'email', type: 'varchar', isUnique: true, isNullable: false },
          { name: 'passwordHash', type: 'varchar', isNullable: false },
          { name: 'role', type: 'enum', enum: ['user', 'merchant', 'admin'], default: "'user'", isNullable: false },
          { name: 'isEmailVerified', type: 'boolean', default: false },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'accounts',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'balance', type: 'decimal', precision: 12, scale: 2, default: 0.00 },
          { name: 'accountType', type: 'enum', enum: ['savings', 'checking', 'merchant_wallet', 'external'], default: "'checking'", isNullable: false },
          { name: 'currency', type: 'varchar', length: 3, isNullable: true },
          { name: 'userId', type: 'uuid', isNullable: false },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'accounts',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createTable(
      new Table({
        name: 'merchants',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar', isUnique: true, isNullable: false },
          { name: 'businessAddress', type: 'varchar', isNullable: false },
          { name: 'publicKey', type: 'varchar', isUnique: true, isNullable: true },
          { name: 'secretKey', type: 'varchar', isUnique: true, isNullable: true },
          { name: 'balance', type: 'decimal', precision: 10, scale: 2, default: 0.00 },
          { name: 'ownerId', type: 'uuid', isNullable: false },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'merchants',
      new TableForeignKey({
        columnNames: ['ownerId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createTable(
      new Table({
        name: 'payments',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'amount', type: 'decimal', precision: 12, scale: 2, isNullable: false },
          { name: 'currency', type: 'varchar', length: 3, isNullable: false },
          { name: 'status', type: 'enum', enum: ['initiated', 'pending', 'success', 'failed', 'refunded', 'cancelled'], default: "'initiated'", isNullable: false },
          { name: 'method', type: 'enum', enum: ['card', 'bank_transfer', 'ussd', 'wallet'], isNullable: false },
          { name: 'externalId', type: 'varchar', isNullable: true },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          { name: 'merchantId', type: 'uuid', isNullable: false },
          { name: 'customerEmail', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'payments',
      new TableForeignKey({
        columnNames: ['merchantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'merchants',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createTable(
      new Table({
        name: 'transactions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'amount', type: 'decimal', precision: 12, scale: 2, isNullable: false },
          { name: 'currency', type: 'varchar', length: 3, isNullable: false },
          { name: 'type', type: 'enum', enum: ['debit', 'credit', 'fee', 'refund'], isNullable: false },
          { name: 'status', type: 'enum', enum: ['pending', 'completed', 'failed', 'reversed'], default: "'pending'", isNullable: false },
          { name: 'description', type: 'varchar', isNullable: true },
          { name: 'sourceAccountId', type: 'uuid', isNullable: true },
          { name: 'destinationAccountId', type: 'uuid', isNullable: true },
          { name: 'paymentId', type: 'uuid', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'completedAt', type: 'timestamp', isNullable: true },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'transactions',
      new TableForeignKey({
        columnNames: ['sourceAccountId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'accounts',
        onDelete: 'SET NULL',
      })
    );

    await queryRunner.createForeignKey(
      'transactions',
      new TableForeignKey({
        columnNames: ['destinationAccountId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'accounts',
        onDelete: 'SET NULL',
      })
    );

    await queryRunner.createForeignKey(
      'transactions',
      new TableForeignKey({
        columnNames: ['paymentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'payments',
        onDelete: 'SET NULL',
      })
    );

    await queryRunner.createTable(
      new Table({
        name: 'webhook_events',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'eventType', type: 'enum', enum: ['payment.success', 'payment.failed', 'refund.success'], isNullable: false },
          { name: 'resourceId', type: 'varchar', isNullable: false },
          { name: 'payload', type: 'jsonb', isNullable: false },
          { name: 'webhookUrl', type: 'varchar', isNullable: false },
          { name: 'merchantId', type: 'uuid', isNullable: false },
          { name: 'status', type: 'enum', enum: ['pending', 'sent', 'failed', 'retrying'], default: "'pending'", isNullable: false },
          { name: 'retryAttempts', type: 'int', default: 0 },
          { name: 'lastAttemptAt', type: 'timestamp', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'webhook_events',
      new TableForeignKey({
        columnNames: ['merchantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'merchants',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('webhook_events', 'FK_WEBHOOK_MERCHANT'); // Or the generated name
    await queryRunner.dropTable('webhook_events');
    await queryRunner.dropForeignKey('transactions', 'FK_TRANSACTION_PAYMENT');
    await queryRunner.dropForeignKey('transactions', 'FK_TRANSACTION_DEST_ACCOUNT');
    await queryRunner.dropForeignKey('transactions', 'FK_TRANSACTION_SOURCE_ACCOUNT');
    await queryRunner.dropTable('transactions');
    await queryRunner.dropForeignKey('payments', 'FK_PAYMENT_MERCHANT');
    await queryRunner.dropTable('payments');
    await queryRunner.dropForeignKey('merchants', 'FK_MERCHANT_OWNER');
    await queryRunner.dropTable('merchants');
    await queryRunner.dropForeignKey('accounts', 'FK_ACCOUNT_USER');
    await queryRunner.dropTable('accounts');
    await queryRunner.dropTable('users');
  }
}
```
*   **Note:** TypeORM migrations automatically generate UUID functions like `uuid_generate_v4()`. You might need to enable the `uuid-ossp` extension in your PostgreSQL database manually (`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`) before running migrations for the first time.

**`backend/seed.ts` (Seed Data Example)**
```typescript