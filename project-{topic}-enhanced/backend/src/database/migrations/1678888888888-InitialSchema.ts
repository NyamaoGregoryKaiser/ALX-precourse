```typescript
import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';
import { UserRole, PostStatus } from '../../users/entities/user.entity'; // For enum types

export class InitialSchema1678888888888 implements MigrationInterface {
  name = 'InitialSchema1678888888888'; // Unique name for your migration

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users Table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'username',
            type: 'varchar',
            length: '100',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'password',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'enum',
            enum: Object.values(UserRole),
            default: `'${UserRole.AUTHOR}'`,
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
      }),
      true,
    );

    // Categories Table
    await queryRunner.createTable(
      new Table({
        name: 'categories',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
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
      }),
      true,
    );

    // Posts Table
    await queryRunner.createTable(
      new Table({
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
            length: '255',
            isNullable: false,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'thumbnailUrl',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: Object.values(PostStatus),
            default: `'${PostStatus.DRAFT}'`,
            isNullable: false,
          },
          {
            name: 'authorId',
            type: 'uuid',
            isNullable: true, // Author can be null if user is deleted (SET NULL)
          },
          {
            name: 'categoryId',
            type: 'uuid',
            isNullable: true, // Category can be null
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
          {
            name: 'publishedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Add Foreign Keys for Posts Table
    await queryRunner.createForeignKey(
      'posts',
      new TableForeignKey({
        columnNames: ['authorId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL', // If a user is deleted, set authorId in posts to NULL
      }),
    );

    await queryRunner.createForeignKey(
      'posts',
      new TableForeignKey({
        columnNames: ['categoryId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'categories',
        onDelete: 'SET NULL', // If a category is deleted, set categoryId in posts to NULL
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const postsTable = await queryRunner.getTable('posts');
    const authorForeignKey = postsTable.foreignKeys.find(fk => fk.columnNames.indexOf('authorId') !== -1);
    const categoryForeignKey = postsTable.foreignKeys.find(fk => fk.columnNames.indexOf('categoryId') !== -1);

    if (authorForeignKey) await queryRunner.dropForeignKey('posts', authorForeignKey);
    if (categoryForeignKey) await queryRunner.dropForeignKey('posts', categoryForeignKey);

    // Drop tables in reverse order of creation
    await queryRunner.dropTable('posts');
    await queryRunner.dropTable('categories');
    await queryRunner.dropTable('users');
  }
}
```