```typescript
import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class InitialSchema1678886400000 implements MigrationInterface {
  name = 'InitialSchema1678886400000';

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
            default: 'uuid_generate_v4()',
          },
          {
            name: 'firstName',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'lastName',
            type: 'varchar',
            length: '50',
            isNullable: false,
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
            isNullable: false,
          },
          {
            name: 'roles',
            type: 'simple-array',
            default: "'USER'", // Default role for new users
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Projects Table
    await queryRunner.createTable(
      new Table({
        name: 'projects',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'ownerId',
            type: 'uuid',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Tasks Table
    await queryRunner.createTable(
      new Table({
        name: 'tasks',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['OPEN', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CLOSED'],
            default: "'OPEN'",
            isNullable: false,
          },
          {
            name: 'priority',
            type: 'enum',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            default: "'MEDIUM'",
            isNullable: false,
          },
          {
            name: 'dueDate',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'projectId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'creatorId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'assigneeId',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Comments Table
    await queryRunner.createTable(
      new Table({
        name: 'comments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'taskId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'authorId',
            type: 'uuid',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Notifications Table
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'message',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'isRead',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'entityType',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'entityId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Foreign Keys

    // Projects to Users (owner)
    await queryRunner.createForeignKey(
      'projects',
      new TableForeignKey({
        columnNames: ['ownerId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Tasks to Projects
    await queryRunner.createForeignKey(
      'tasks',
      new TableForeignKey({
        columnNames: ['projectId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'projects',
        onDelete: 'CASCADE',
      }),
    );

    // Tasks to Users (creator)
    await queryRunner.createForeignKey(
      'tasks',
      new TableForeignKey({
        columnNames: ['creatorId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL', // If creator is deleted, task remains but creator is null
      }),
    );

    // Tasks to Users (assignee)
    await queryRunner.createForeignKey(
      'tasks',
      new TableForeignKey({
        columnNames: ['assigneeId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL', // If assignee is deleted, task remains but assignee is null
      }),
    );

    // Comments to Tasks
    await queryRunner.createForeignKey(
      'comments',
      new TableForeignKey({
        columnNames: ['taskId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tasks',
        onDelete: 'CASCADE',
      }),
    );

    // Comments to Users (author)
    await queryRunner.createForeignKey(
      'comments',
      new TableForeignKey({
        columnNames: ['authorId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    // Notifications to Users
    await queryRunner.createForeignKey(
      'notifications',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first (reverse order of creation is often safest)
    const tables = ['notifications', 'comments', 'tasks', 'projects']; // Order of tables for dropping
    for (const tableName of tables) {
      const table = await queryRunner.getTable(tableName);
      const foreignKeys = table.foreignKeys.filter(fk => fk.columnNames.some(cn => cn.endsWith('Id')));
      await Promise.all(foreignKeys.map(fk => queryRunner.dropForeignKey(tableName, fk)));
    }

    // Drop tables
    await queryRunner.dropTable('notifications');
    await queryRunner.dropTable('comments');
    await queryRunner.dropTable('tasks');
    await queryRunner.dropTable('projects');
    await queryRunner.dropTable('users');
  }
}
```