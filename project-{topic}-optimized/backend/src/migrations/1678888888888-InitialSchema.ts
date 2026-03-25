import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

/**
 * TypeORM migration to create the initial database schema for the Task Management System.
 * This migration creates the `users`, `projects`, and `tasks` tables with their respective columns,
 * primary keys, unique constraints, and foreign key relationships.
 *
 * Migration timestamp should be replaced with an actual timestamp (e.g., `Date.now()`).
 *
 * To generate: `npm run migration:generate -- src/migrations/InitialSchema`
 * To run: `npm run migration:run`
 * To revert: `npm run migration:revert`
 */
export class InitialSchema1678888888888 implements MigrationInterface {
  name = 'InitialSchema1678888888888'; // Replace 1678888888888 with an actual timestamp

  /**
   * `up` method is executed when the migration is run.
   * It contains the logic to create tables and their relationships.
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create 'users' table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()', // Uses PostgreSQL's UUID generation
          },
          {
            name: 'username',
            type: 'varchar',
            length: '50',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '100',
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
            type: 'simple-array', // Stores roles as a comma-separated string
            default: `'USER'`, // Default role for new users
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'NOW()',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'NOW()',
            onUpdate: 'NOW()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create 'projects' table
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
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'ownerId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'NOW()',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'NOW()',
            onUpdate: 'NOW()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Add foreign key constraint for 'projects' table referencing 'users'
    await queryRunner.createForeignKey(
      'projects',
      new TableForeignKey({
        columnNames: ['ownerId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE', // If a user is deleted, their projects are also deleted
        onUpdate: 'CASCADE',
      }),
    );

    // Create 'tasks' table
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
            enum: ['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'CANCELED'],
            default: `'TODO'`,
            isNullable: false,
          },
          {
            name: 'priority',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'dueDate',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'projectId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'assignedToId',
            type: 'uuid',
            isNullable: true, // A task can be unassigned
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'NOW()',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'NOW()',
            onUpdate: 'NOW()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Add foreign key constraint for 'tasks' table referencing 'projects'
    await queryRunner.createForeignKey(
      'tasks',
      new TableForeignKey({
        columnNames: ['projectId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'projects',
        onDelete: 'CASCADE', // If a project is deleted, its tasks are also deleted
        onUpdate: 'CASCADE',
      }),
    );

    // Add foreign key constraint for 'tasks' table referencing 'users' (for assignedTo)
    await queryRunner.createForeignKey(
      'tasks',
      new TableForeignKey({
        columnNames: ['assignedToId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL', // If an assigned user is deleted, tasks remain but assignment is nullified
        onUpdate: 'CASCADE',
      }),
    );
  }

  /**
   * `down` method is executed when the migration is reverted.
   * It contains the logic to drop tables and foreign keys in reverse order of creation.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints first to avoid dependency issues
    const tasksTable = await queryRunner.getTable('tasks');
    const projectForeignKey = tasksTable.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('projectId') !== -1,
    );
    const assignedToForeignKey = tasksTable.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('assignedToId') !== -1,
    );
    if (projectForeignKey) {
      await queryRunner.dropForeignKey('tasks', projectForeignKey);
    }
    if (assignedToForeignKey) {
      await queryRunner.dropForeignKey('tasks', assignedToForeignKey);
    }

    const projectsTable = await queryRunner.getTable('projects');
    const ownerForeignKey = projectsTable.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('ownerId') !== -1,
    );
    if (ownerForeignKey) {
      await queryRunner.dropForeignKey('projects', ownerForeignKey);
    }

    // Drop tables
    await queryRunner.dropTable('tasks');
    await queryRunner.dropTable('projects');
    await queryRunner.dropTable('users');
  }
}