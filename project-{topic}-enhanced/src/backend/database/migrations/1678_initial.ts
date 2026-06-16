import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateInitialSchema1678... implements MigrationInterface { // Use a real timestamp
    name = 'CreateInitialSchema1678...'; // Use a real timestamp

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Users Table
        await queryRunner.createTable(new Table({
            name: 'user',
            columns: [
                { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
                { name: 'username', type: 'varchar', isUnique: true },
                { name: 'email', type: 'varchar', isUnique: true },
                { name: 'password', type: 'varchar' },
                { name: 'role', type: 'varchar', default: "'user'" },
                { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
            ],
        }), true);

        // Projects Table
        await queryRunner.createTable(new Table({
            name: 'project',
            columns: [
                { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
                { name: 'name', type: 'varchar' },
                { name: 'description', type: 'text', isNullable: true },
                { name: 'ownerId', type: 'uuid' },
                { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
            ],
        }), true);

        // Foreign Key for Project.ownerId to User.id
        await queryRunner.createForeignKey('project', new TableForeignKey({
            columnNames: ['ownerId'],
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            name: 'FK_project_ownerId'
        }));

        // Tasks Table
        await queryRunner.createTable(new Table({
            name: 'task',
            columns: [
                { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
                { name: 'title', type: 'varchar' },
                { name: 'description', type: 'text', isNullable: true },
                { name: 'status', type: 'enum', enum: ['open', 'in_progress', 'completed', 'closed'], default: "'open'" },
                { name: 'priority', type: 'enum', enum: ['low', 'medium', 'high'], default: "'medium'" },
                { name: 'dueDate', type: 'timestamp', isNullable: true },
                { name: 'projectId', type: 'uuid' },
                { name: 'assigneeId', type: 'uuid', isNullable: true },
                { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
            ],
        }), true);

        // Foreign Key for Task.projectId to Project.id
        await queryRunner.createForeignKey('task', new TableForeignKey({
            columnNames: ['projectId'],
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            name: 'FK_task_projectId'
        }));

        // Foreign Key for Task.assigneeId to User.id
        await queryRunner.createForeignKey('task', new TableForeignKey({
            columnNames: ['assigneeId'],
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL', // If user deleted, set assignee to null
            onUpdate: 'CASCADE',
            name: 'FK_task_assigneeId'
        }));

        // Add indexes for common query fields
        await queryRunner.createIndex('project', new TableIndex({
            columnNames: ['ownerId'],
            name: 'IDX_project_ownerId'
        }));

        await queryRunner.createIndex('task', new TableIndex({
            columnNames: ['projectId'],
            name: 'IDX_task_projectId'
        }));

        await queryRunner.createIndex('task', new TableIndex({
            columnNames: ['assigneeId'],
            name: 'IDX_task_assigneeId'
        }));

        await queryRunner.createIndex('task', new TableIndex({
            columnNames: ['status'],
            name: 'IDX_task_status'
        }));

        await queryRunner.createIndex('task', new TableIndex({
            columnNames: ['priority'],
            name: 'IDX_task_priority'
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.dropIndex('task', 'IDX_task_priority');
        await queryRunner.dropIndex('task', 'IDX_task_status');
        await queryRunner.dropIndex('task', 'IDX_task_assigneeId');
        await queryRunner.dropIndex('task', 'IDX_task_projectId');
        await queryRunner.dropIndex('project', 'IDX_project_ownerId');

        // Drop foreign keys
        await queryRunner.dropForeignKey('task', 'FK_task_assigneeId');
        await queryRunner.dropForeignKey('task', 'FK_task_projectId');
        await queryRunner.dropForeignKey('project', 'FK_project_ownerId');

        // Drop tables in reverse order of creation
        await queryRunner.dropTable('task');
        await queryRunner.dropTable('project');
        await queryRunner.dropTable('user');
    }
}
```
*Note: Replace `1678...` with an actual timestamp like `1678881234567` (unix timestamp in ms) when generating a real migration.*

**Backend: `src/backend/database/migrations/1678...seed.ts` (Example)**
```typescript