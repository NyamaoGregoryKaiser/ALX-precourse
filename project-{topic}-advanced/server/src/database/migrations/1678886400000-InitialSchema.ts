import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';
import { UserRole } from '../../types/user.types';
import { DataSourceType } from '../../types/dataSource.types';
import { ChartType } from '../../types/chart.types';

export class InitialSchema1678886400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'username', type: 'varchar', length: '255', isUnique: true },
          { name: 'email', type: 'varchar', length: '255', isUnique: true },
          { name: 'password', type: 'varchar', length: '255' },
          { name: 'role', type: 'enum', enum: Object.values(UserRole), default: `'${UserRole.VIEWER}'` },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'data_sources',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'name', type: 'varchar', length: '255' },
          { name: 'type', type: 'enum', enum: Object.values(DataSourceType), default: `'${DataSourceType.POSTGRESQL}'` },
          { name: 'connectionDetails', type: 'text' }, // Encrypted JSON
          { name: 'userId', type: 'uuid' },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'data_sources',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createTable(
      new Table({
        name: 'charts',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'name', type: 'varchar', length: '255' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'type', type: 'enum', enum: Object.values(ChartType), default: `'${ChartType.BAR}'` },
          { name: 'dataSourceId', type: 'uuid', isNullable: true },
          { name: 'query', type: 'text', isNullable: true },
          { name: 'configuration', type: 'jsonb' }, // ECharts options as JSON
          { name: 'userId', type: 'uuid' },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'charts',
      new TableForeignKey({
        columnNames: ['dataSourceId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'data_sources',
        onDelete: 'SET NULL',
      })
    );

    await queryRunner.createForeignKey(
      'charts',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createTable(
      new Table({
        name: 'dashboards',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'name', type: 'varchar', length: '255' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'layout', type: 'jsonb', isNullable: true }, // For react-grid-layout
          { name: 'userId', type: 'uuid' },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'dashboards',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createTable(
      new Table({
        name: 'dashboard_charts', // Junction table for Many-to-Many
        columns: [
          { name: 'dashboardId', type: 'uuid', isPrimary: true },
          { name: 'chartId', type: 'uuid', isPrimary: true },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'dashboard_charts',
      new TableForeignKey({
        columnNames: ['dashboardId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'dashboards',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'dashboard_charts',
      new TableForeignKey({
        columnNames: ['chartId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'charts',
        onDelete: 'CASCADE',
      })
    );

    // Add indexes for query optimization
    await queryRunner.createIndex('users', new Table({ name: 'IDX_USER_EMAIL', columnNames: ['email'], isUnique: true }));
    await queryRunner.createIndex('data_sources', new Table({ name: 'IDX_DS_USERID', columnNames: ['userId'] }));
    await queryRunner.createIndex('charts', new Table({ name: 'IDX_CHART_DATASOURCEID', columnNames: ['dataSourceId'] }));
    await queryRunner.createIndex('charts', new Table({ name: 'IDX_CHART_USERID', columnNames: ['userId'] }));
    await queryRunner.createIndex('dashboards', new Table({ name: 'IDX_DASH_USERID', columnNames: ['userId'] }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('dashboard_charts');
    await queryRunner.dropTable('dashboards');
    await queryRunner.dropTable('charts');
    await queryRunner.dropTable('data_sources');
    await queryRunner.dropTable('users');
  }
}