```typescript
import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class InitialMigration1678886400000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Users Table
        await queryRunner.createTable(new Table({
            name: 'users',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: 'uuid',
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
                    name: 'role',
                    type: 'enum',
                    enum: ['user', 'admin'],
                    default: "'user'",
                    isNullable: false,
                },
                {
                    name: 'created_at',
                    type: 'timestamp',
                    default: 'now()',
                },
                {
                    name: 'updated_at',
                    type: 'timestamp',
                    default: 'now()',
                },
            ],
        }), true);

        // Projects Table
        await queryRunner.createTable(new Table({
            name: 'projects',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: 'uuid',
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
                    name: 'user_id',
                    type: 'uuid',
                    isNullable: false,
                },
                {
                    name: 'created_at',
                    type: 'timestamp',
                    default: 'now()',
                },
                {
                    name: 'updated_at',
                    type: 'timestamp',
                    default: 'now()',
                },
            ],
        }), true);

        // Foreign Key for Projects to Users
        await queryRunner.createForeignKey('projects', new TableForeignKey({
            columnNames: ['user_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
        }));

        // Monitors Table
        await queryRunner.createTable(new Table({
            name: 'monitors',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: 'uuid',
                },
                {
                    name: 'name',
                    type: 'varchar',
                    length: '100',
                    isNullable: false,
                },
                {
                    name: 'url',
                    type: 'varchar',
                    length: '255',
                    isNullable: false,
                },
                {
                    name: 'method',
                    type: 'varchar',
                    length: '10',
                    default: "'GET'",
                    isNullable: false,
                },
                {
                    name: 'interval_seconds',
                    type: 'integer',
                    default: 60, // Default to 60 seconds
                    isNullable: false,
                },
                {
                    name: 'status',
                    type: 'enum',
                    enum: ['active', 'paused'],
                    default: "'active'",
                    isNullable: false,
                },
                {
                    name: 'project_id',
                    type: 'uuid',
                    isNullable: false,
                },
                {
                    name: 'last_check_at',
                    type: 'timestamp',
                    isNullable: true,
                },
                {
                    name: 'created_at',
                    type: 'timestamp',
                    default: 'now()',
                },
                {
                    name: 'updated_at',
                    type: 'timestamp',
                    default: 'now()',
                },
            ],
        }), true);

        // Foreign Key for Monitors to Projects
        await queryRunner.createForeignKey('monitors', new TableForeignKey({
            columnNames: ['project_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'projects',
            onDelete: 'CASCADE',
        }));

        // Metrics Table
        await queryRunner.createTable(new Table({
            name: 'metrics',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: 'uuid',
                },
                {
                    name: 'monitor_id',
                    type: 'uuid',
                    isNullable: false,
                },
                {
                    name: 'timestamp',
                    type: 'timestamp',
                    default: 'now()',
                    isNullable: false,
                },
                {
                    name: 'response_time_ms',
                    type: 'integer',
                    isNullable: true, // Can be null if there was a connection error
                },
                {
                    name: 'status_code',
                    type: 'integer',
                    isNullable: true, // Can be null if no HTTP response
                },
                {
                    name: 'status_text',
                    type: 'varchar',
                    isNullable: true,
                },
                {
                    name: 'error',
                    type: 'text',
                    isNullable: true,
                },
            ],
        }), true);

        // Foreign Key for Metrics to Monitors
        await queryRunner.createForeignKey('metrics', new TableForeignKey({
            columnNames: ['monitor_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'monitors',
            onDelete: 'CASCADE',
        }));

        // Alerts Table
        await queryRunner.createTable(new Table({
            name: 'alerts',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: 'uuid',
                },
                {
                    name: 'monitor_id',
                    type: 'uuid',
                    isNullable: false,
                },
                {
                    name: 'type',
                    type: 'enum',
                    enum: ['response_time', 'status_code'],
                    isNullable: false,
                },
                {
                    name: 'threshold',
                    type: 'integer',
                    isNullable: false,
                },
                {
                    name: 'condition',
                    type: 'enum',
                    enum: ['gt', 'gte', 'lt', 'lte', 'eq', 'neq'], // greater than, greater than or equal, etc.
                    isNullable: false,
                },
                {
                    name: 'message',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'is_active',
                    type: 'boolean',
                    default: true,
                },
                {
                    name: 'status',
                    type: 'enum',
                    enum: ['ok', 'alert', 'resolved'],
                    default: "'ok'",
                },
                {
                    name: 'last_triggered_at',
                    type: 'timestamp',
                    isNullable: true,
                },
                {
                    name: 'created_at',
                    type: 'timestamp',
                    default: 'now()',
                },
                {
                    name: 'updated_at',
                    type: 'timestamp',
                    default: 'now()',
                },
            ],
        }), true);

        // Foreign Key for Alerts to Monitors
        await queryRunner.createForeignKey('alerts', new TableForeignKey({
            columnNames: ['monitor_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'monitors',
            onDelete: 'CASCADE',
        }));

        // Add indexes for performance
        await queryRunner.createIndex('metrics', {
            columnNames: ['monitor_id', 'timestamp'],
            name: 'IDX_METRIC_MONITOR_TIMESTAMP',
        });
        await queryRunner.createIndex('monitors', {
            columnNames: ['project_id', 'status'],
            name: 'IDX_MONITOR_PROJECT_STATUS',
        });
        await queryRunner.createIndex('projects', {
            columnNames: ['user_id'],
            name: 'IDX_PROJECT_USER_ID',
        });
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys first
        const metricsTable = await queryRunner.getTable('metrics');
        const monitorsTable = await queryRunner.getTable('monitors');
        const projectsTable = await queryRunner.getTable('projects');
        const alertsTable = await queryRunner.getTable('alerts');

        if (metricsTable) {
            await queryRunner.dropForeignKey('metrics', 'FK_METRICS_MONITOR_ID'); // Name auto-generated by TypeORM if not specified, usually FK_tablename_columnname
            await queryRunner.dropIndex('metrics', 'IDX_METRIC_MONITOR_TIMESTAMP');
        }
        if (alertsTable) {
            await queryRunner.dropForeignKey('alerts', 'FK_ALERTS_MONITOR_ID');
        }
        if (monitorsTable) {
            await queryRunner.dropForeignKey('monitors', 'FK_MONITORS_PROJECT_ID');
            await queryRunner.dropIndex('monitors', 'IDX_MONITOR_PROJECT_STATUS');
        }
        if (projectsTable) {
            await queryRunner.dropForeignKey('projects', 'FK_PROJECTS_USER_ID');
            await queryRunner.dropIndex('projects', 'IDX_PROJECT_USER_ID');
        }

        // Drop tables
        await queryRunner.dropTable('alerts');
        await queryRunner.dropTable('metrics');
        await queryRunner.dropTable('monitors');
        await queryRunner.dropTable('projects');
        await queryRunner.dropTable('users');
    }

}
```