```typescript
// To generate this: `npm run migration:create --name InitialSchema`
// Then `npm run migration:run`
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';
import { UserRole } from '../entities/Role';

export class InitialSchema1678886400000 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create Roles table
    await queryRunner.createTable(new Table({
      name: 'roles',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          isPrimary: true,
          default: 'gen_random_uuid()',
        },
        {
          name: 'name',
          type: 'enum',
          enum: Object.values(UserRole),
          isUnique: true,
          default: `'${UserRole.USER}'`,
        },
        {
          name: 'description',
          type: 'varchar',
          isNullable: true,
        },
      ],
    }), true);

    // Insert default roles
    await queryRunner.query(`
            INSERT INTO roles (id, name, description) VALUES
            (gen_random_uuid(), '${UserRole.ADMIN}', 'Administrator role with full access'),
            (gen_random_uuid(), '${UserRole.USER}', 'Standard user role')
            ON CONFLICT (name) DO NOTHING;
        `);


    // Create Users table
    await queryRunner.createTable(new Table({
      name: 'users',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          isPrimary: true,
          default: 'gen_random_uuid()',
        },
        {
          name: 'email',
          type: 'varchar',
          isUnique: true,
          isNullable: false,
        },
        {
          name: 'password',
          type: 'varchar',
          isNullable: true, // For potential social logins
        },
        {
          name: 'firstName',
          type: 'varchar',
          isNullable: true,
        },
        {
          name: 'lastName',
          type: 'varchar',
          isNullable: true,
        },
        {
          name: 'roleId',
          type: 'uuid',
          isNullable: true, // Role might be assigned after user creation
        },
        {
          name: 'isEmailVerified',
          type: 'boolean',
          default: false,
        },
        {
          name: 'verificationToken',
          type: 'varchar',
          isNullable: true,
        },
        {
          name: 'verificationTokenExpires',
          type: 'timestamp',
          isNullable: true,
        },
        {
          name: 'resetPasswordToken',
          type: 'varchar',
          isNullable: true,
        },
        {
          name: 'resetPasswordTokenExpires',
          type: 'timestamp',
          isNullable: true,
        },
        {
          name: 'createdAt',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
        },
        {
          name: 'updatedAt',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
          onUpdate: 'CURRENT_TIMESTAMP',
        },
      ],
    }), true);

    // Add foreign key to Users table referencing Roles
    await queryRunner.createForeignKey('users', new TableForeignKey({
      columnNames: ['roleId'],
      referencedColumnNames: ['id'],
      referencedTableName: 'roles',
      onDelete: 'SET NULL',
    }));

    // Add index to email for faster lookups
    await queryRunner.createIndex('users', new TableIndex({
      columnNames: ['email'],
      isUnique: true,
    }));

    // Create BlacklistedTokens table
    await queryRunner.createTable(new Table({
      name: 'blacklisted_tokens',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          isPrimary: true,
          default: 'gen_random_uuid()',
        },
        {
          name: 'token',
          type: 'varchar',
          isUnique: true,
          isNullable: false,
        },
        {
          name: 'expiresAt',
          type: 'timestamp',
          isNullable: false,
        },
        {
          name: 'createdAt',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
        },
      ],
    }), true);

    // Add index to token for faster lookups
    await queryRunner.createIndex('blacklisted_tokens', new TableIndex({
      columnNames: ['token'],
      isUnique: true,
    }));

    // Create Posts table (example for CRUD with auth)
    await queryRunner.createTable(new Table({
      name: 'posts',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          isPrimary: true,
          default: 'gen_random_uuid()',
        },
        {
          name: 'title',
          type: 'varchar',
          isNullable: false,
        },
        {
          name: 'content',
          type: 'text',
          isNullable: false,
        },
        {
          name: 'authorId',
          type: 'uuid',
          isNullable: false,
        },
        {
          name: 'createdAt',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
        },
        {
          name: 'updatedAt',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
          onUpdate: 'CURRENT_TIMESTAMP',
        },
      ],
    }), true);

    // Add foreign key to Posts table referencing Users
    await queryRunner.createForeignKey('posts', new TableForeignKey({
      columnNames: ['authorId'],
      referencedColumnNames: ['id'],
      referencedTableName: 'users',
      onDelete: 'CASCADE', // If user is deleted, their posts are also deleted
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('posts', 'FK_posts_authorId');
    await queryRunner.dropTable('posts');

    await queryRunner.dropIndex('blacklisted_tokens', 'IDX_e5e8c1b3e8c1a9a8d7a4b6c2d1'); // Replace with actual index name
    await queryRunner.dropTable('blacklisted_tokens');

    await queryRunner.dropIndex('users', 'IDX_97672ac88f789774dd47f7c8eb'); // Replace with actual index name
    await queryRunner.dropForeignKey('users', 'FK_users_roleId');
    await queryRunner.dropTable('users');
    await queryRunner.dropTable('roles');
  }
}
```