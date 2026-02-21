```typescript
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableUnique } from 'typeorm';
import { UserRole } from '../src/entities/User'; // Assuming UserRole enum is defined here

export class InitialSchema1701999999999 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create User table
    await queryRunner.createTable(
      new Table({
        name: 'user',
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
            length: '255',
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
            default: `'${UserRole.USER}'`,
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
            onUpdate: 'now()',
          },
        ],
      }),
      true
    );

    // Create DataSource table
    await queryRunner.createTable(
      new Table({
        name: 'data_source',
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
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['csv', 'database'],
            default: `'csv'`,
            isNullable: false,
          },
          {
            name: 'configuration',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
            onUpdate: 'now()',
          },
        ],
      }),
      true
    );

    // Create Dashboard table
    await queryRunner.createTable(
      new Table({
        name: 'dashboard',
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
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
            onUpdate: 'now()',
          },
        ],
      }),
      true
    );

    // Create Chart table
    await queryRunner.createTable(
      new Table({
        name: 'chart',
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
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['bar', 'line', 'pie', 'scatterplot'],
            default: `'bar'`,
            isNullable: false,
          },
          {
            name: 'configuration',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'dashboardId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'dataSourceId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
            onUpdate: 'now()',
          },
        ],
      }),
      true
    );

    // Add Foreign Keys
    await queryRunner.createForeignKey(
      'data_source',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'dashboard',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'chart',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'chart',
      new TableForeignKey({
        columnNames: ['dashboardId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'dashboard',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'chart',
      new TableForeignKey({
        columnNames: ['dataSourceId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'data_source',
        onDelete: 'RESTRICT', // Important: prevent deleting data source if charts depend on it
      })
    );

    // Add unique constraint for (name, userId) on DataSource and Dashboard
    await queryRunner.createUniqueConstraint(
      'data_source',
      new TableUnique({
        name: 'UQ_DATA_SOURCE_NAME_USER',
        columnNames: ['name', 'userId'],
      })
    );

    await queryRunner.createUniqueConstraint(
      'dashboard',
      new TableUnique({
        name: 'UQ_DASHBOARD_NAME_USER',
        columnNames: ['name', 'userId'],
      })
    );

    // Indices for foreign keys and frequently queried columns
    await queryRunner.createIndex('data_source', {
      columnNames: ['userId'],
      name: 'IDX_DATA_SOURCE_USER_ID',
    });
    await queryRunner.createIndex('dashboard', {
      columnNames: ['userId'],
      name: 'IDX_DASHBOARD_USER_ID',
    });
    await queryRunner.createIndex('chart', {
      columnNames: ['userId'],
      name: 'IDX_CHART_USER_ID',
    });
    await queryRunner.createIndex('chart', {
      columnNames: ['dashboardId'],
      name: 'IDX_CHART_DASHBOARD_ID',
    });
    await queryRunner.createIndex('chart', {
      columnNames: ['dataSourceId'],
      name: 'IDX_CHART_DATA_SOURCE_ID',
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order of creation due to foreign key constraints
    await queryRunner.dropTable('chart');
    await queryRunner.dropTable('dashboard');
    await queryRunner.dropTable('data_source');
    await queryRunner.dropTable('user');
  }
}
```