```typescript
import { MigrationInterface, QueryRunner, Table, TableUnique, TableForeignKey } from 'typeorm';
import { UserRole } from '../entities/user.entity';
import { DatabaseType } from '../entities/db-connection.entity';
import { RecommendationType, RecommendationStatus, RecommendationSeverity } from '../entities/recommendation.entity';

// Placeholder timestamp for initial migration, replace with actual generated one
export class InitialSchema1700000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Users Table
        await queryRunner.createTable(
            new Table({
                name: 'users',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
                    { name: 'username', type: 'varchar', length: 100, isUnique: true, isNullable: false },
                    { name: 'email', type: 'varchar', length: 255, isUnique: true, isNullable: false },
                    { name: 'password', type: 'varchar', length: 255, isNullable: false },
                    { name: 'role', type: 'enum', enum: Object.values(UserRole), default: `'${UserRole.USER}'`, isNullable: false },
                    { name: 'refreshToken', type: 'text', isNullable: true },
                    { name: 'createdAt', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
                    { name: 'updatedAt', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
                ],
            }),
            true,
        );

        // DbConnections Table
        await queryRunner.createTable(
            new Table({
                name: 'db_connections',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
                    { name: 'name', type: 'varchar', length: 100, isNullable: false },
                    { name: 'type', type: 'enum', enum: Object.values(DatabaseType), isNullable: false },
                    { name: 'host', type: 'varchar', length: 255, isNullable: false },
                    { name: 'port', type: 'int', isNullable: false },
                    { name: 'databaseName', type: 'varchar', length: 255, isNullable: false },
                    { name: 'username', type: 'varchar', length: 100, isNullable: false },
                    { name: 'password', type: 'varchar', length: 255, isNullable: false },
                    { name: 'isActive', type: 'boolean', default: true },
                    { name: 'createdAt', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
                    { name: 'updatedAt', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
                    { name: 'userId', type: 'uuid', isNullable: false },
                ],
            }),
            true,
        );

        // SlowQueryLogs Table
        await queryRunner.createTable(
            new Table({
                name: 'slow_query_logs',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
                    { name: 'query', type: 'text', isNullable: false },
                    { name: 'queryHash', type: 'varchar', length: 64, isNullable: false },
                    { name: 'durationMs', type: 'int', isNullable: false },
                    { name: 'executionPlan', type: 'text', isNullable: true },
                    { name: 'metadata', type: 'jsonb', isNullable: true },
                    { name: 'createdAt', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
                    { name: 'dbConnectionId', type: 'uuid', isNullable: false },
                    { name: 'userId', type: 'uuid', isNullable: false },
                ],
            }),
            true,
        );

        // Recommendations Table
        await queryRunner.createTable(
            new Table({
                name: 'recommendations',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
                    { name: 'type', type: 'enum', enum: Object.values(RecommendationType), isNullable: false },
                    { name: 'title', type: 'text', isNullable: false },
                    { name: 'description', type: 'text', isNullable: false },
                    { name: 'suggestedAction', type: 'text', isNullable: false },
                    { name: 'potentialBenefit', type: 'text', isNullable: true },
                    { name: 'severity', type: 'enum', enum: Object.values(RecommendationSeverity), default: `'${RecommendationSeverity.MEDIUM}'`, isNullable: false },
                    { name: 'status', type: 'enum', enum: Object.values(RecommendationStatus), default: `'${RecommendationStatus.OPEN}'`, isNullable: false },
                    { name: 'metadata', type: 'jsonb', isNullable: true },
                    { name: 'createdAt', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
                    { name: 'updatedAt', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
                    { name: 'dbConnectionId', type: 'uuid', isNullable: false },
                    { name: 'userId', type: 'uuid', isNullable: false },
                ],
            }),
            true,
        );

        // Foreign Keys
        await queryRunner.createForeignKey(
            'db_connections',
            new TableForeignKey({
                columnNames: ['userId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'CASCADE',
            }),
        );
        await queryRunner.createForeignKey(
            'slow_query_logs',
            new TableForeignKey({
                columnNames: ['dbConnectionId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'db_connections',
                onDelete: 'CASCADE',
            }),
        );
        await queryRunner.createForeignKey(
            'slow_query_logs',
            new TableForeignKey({
                columnNames: ['userId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'CASCADE',
            }),
        );
        await queryRunner.createForeignKey(
            'recommendations',
            new TableForeignKey({
                columnNames: ['dbConnectionId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'db_connections',
                onDelete: 'CASCADE',
            }),
        );
        await queryRunner.createForeignKey(
            'recommendations',
            new TableForeignKey({
                columnNames: ['userId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'CASCADE',
            }),
        );

        // Add indexes
        await queryRunner.createIndex('slow_query_logs', new TableUnique({
            name: 'IDX_SLOW_QUERY_LOG_CONN_HASH_CREATED',
            columnNames: ['dbConnectionId', 'queryHash', 'createdAt'],
        }));
        await queryRunner.createIndex('recommendations', new TableUnique({
            name: 'IDX_RECOMMENDATION_CONN_TYPE_STATUS',
            columnNames: ['dbConnectionId', 'type', 'status'],
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys first
        const dbConnectionsTable = await queryRunner.getTable('db_connections');
        const slowQueryLogsTable = await queryRunner.getTable('slow_query_logs');
        const recommendationsTable = await queryRunner.getTable('recommendations');

        const fkDbConnectionUser = dbConnectionsTable?.foreignKeys.find(fk => fk.columnNames.indexOf('userId') !== -1);
        if (fkDbConnectionUser) await queryRunner.dropForeignKey('db_connections', fkDbConnectionUser);

        const fkSlowQueryLogDbConnection = slowQueryLogsTable?.foreignKeys.find(fk => fk.columnNames.indexOf('dbConnectionId') !== -1);
        const fkSlowQueryLogUser = slowQueryLogsTable?.foreignKeys.find(fk => fk.columnNames.indexOf('userId') !== -1);
        if (fkSlowQueryLogDbConnection) await queryRunner.dropForeignKey('slow_query_logs', fkSlowQueryLogDbConnection);
        if (fkSlowQueryLogUser) await queryRunner.dropForeignKey('slow_query_logs', fkSlowQueryLogUser);

        const fkRecommendationDbConnection = recommendationsTable?.foreignKeys.find(fk => fk.columnNames.indexOf('dbConnectionId') !== -1);
        const fkRecommendationUser = recommendationsTable?.foreignKeys.find(fk => fk.columnNames.indexOf('userId') !== -1);
        if (fkRecommendationDbConnection) await queryRunner.dropForeignKey('recommendations', fkRecommendationDbConnection);
        if (fkRecommendationUser) await queryRunner.dropForeignKey('recommendations', fkRecommendationUser);

        // Drop indexes
        await queryRunner.dropIndex('slow_query_logs', 'IDX_SLOW_QUERY_LOG_CONN_HASH_CREATED');
        await queryRunner.dropIndex('recommendations', 'IDX_RECOMMENDATION_CONN_TYPE_STATUS');

        // Drop tables in reverse order of creation
        await queryRunner.dropTable('recommendations');
        await queryRunner.dropTable('slow_query_logs');
        await queryRunner.dropTable('db_connections');
        await queryRunner.dropTable('users');
    }
}
```