```typescript
import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class InitialSchema1701000000000 implements MigrationInterface {
  name = 'InitialSchema1701000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
            enum: ['admin', 'user'],
            default: "'user'",
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
            onUpdate: 'now()',
            isNullable: false,
          },
        ],
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'databases',
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
            length: '255',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['postgresql', 'mysql', 'sqlserver', 'oracle'],
            default: "'postgresql'",
            isNullable: false,
          },
          {
            name: 'connection_string',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'owner_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
            onUpdate: 'now()',
            isNullable: false,
          },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'databases',
      new TableForeignKey({
        columnNames: ['owner_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createTable(
      new Table({
        name: 'slow_queries',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'query',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'execution_time_ms',
            type: 'numeric',
            isNullable: false,
          },
          {
            name: 'client_application',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'client_hostname',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'database_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'reporter_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'reported_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
            onUpdate: 'now()',
            isNullable: false,
          },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'slow_queries',
      new TableForeignKey({
        columnNames: ['database_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'databases',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'slow_queries',
      new TableForeignKey({
        columnNames: ['reporter_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      })
    );

    await queryRunner.createTable(
      new Table({
        name: 'query_plans',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'slow_query_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'plan_data',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'format',
            type: 'enum',
            enum: ['json', 'text', 'xml'],
            default: "'json'",
            isNullable: false,
          },
          {
            name: 'total_cost',
            type: 'numeric',
            isNullable: true,
          },
          {
            name: 'actual_rows',
            type: 'numeric',
            isNullable: true,
          },
          {
            name: 'generated_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'query_plans',
      new TableForeignKey({
        columnNames: ['slow_query_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'slow_queries',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createTable(
      new Table({
        name: 'query_suggestions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'slow_query_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['index_creation', 'query_rewrite', 'partitioning', 'statistics_update', 'other'],
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'sql_statement',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'applied', 'dismissed'],
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'suggested_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'applied_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'dismissed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'feedback',
            type: 'text',
            isNullable: true,
          },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'query_suggestions',
      new TableForeignKey({
        columnNames: ['slow_query_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'slow_queries',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('query_suggestions', 'FK_slow_query_id_query_suggestions');
    await queryRunner.dropTable('query_suggestions');
    await queryRunner.dropForeignKey('query_plans', 'FK_slow_query_id_query_plans');
    await queryRunner.dropTable('query_plans');
    await queryRunner.dropForeignKey('slow_queries', 'FK_reporter_id_slow_queries');
    await queryRunner.dropForeignKey('slow_queries', 'FK_database_id_slow_queries');
    await queryRunner.dropTable('slow_queries');
    await queryRunner.dropForeignKey('databases', 'FK_owner_id_databases');
    await queryRunner.dropTable('databases');
    await queryRunner.dropTable('users');
  }
}
```

#### `backend/src/database/seeds/index.ts`