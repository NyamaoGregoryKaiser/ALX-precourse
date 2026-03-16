import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';
import { UserRole } from '../entities/User';
import { DataSourceType } from '../entities/DataSource';
import { VisualizationType } from '../entities/Visualization';

export class InitialSchema1701000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'username', type: 'varchar', isUnique: true },
          { name: 'email', type: 'varchar', isUnique: true },
          { name: 'password', type: 'varchar' },
          { name: 'role', type: 'enum', enum: Object.values(UserRole), default: `'${UserRole.USER}'` },
          { name: 'createdAt', type: 'timestamp with time zone', default: 'NOW()' },
          { name: 'updatedAt', type: 'timestamp with time zone', default: 'NOW()' },
        ],
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'data_sources',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar' },
          { name: 'type', type: 'enum', enum: Object.values(DataSourceType), default: `'${DataSourceType.CSV_MOCK}'` },
          { name: 'config', type: 'jsonb', isNullable: true },
          { name: 'ownerId', type: 'uuid' },
          { name: 'createdAt', type: 'timestamp with time zone', default: 'NOW()' },
          { name: 'updatedAt', type: 'timestamp with time zone', default: 'NOW()' },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'data_sources',
      new TableForeignKey({
        columnNames: ['ownerId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createTable(
      new Table({
        name: 'dashboards',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'layout', type: 'jsonb', isNullable: true },
          { name: 'ownerId', type: 'uuid' },
          { name: 'createdAt', type: 'timestamp with time zone', default: 'NOW()' },
          { name: 'updatedAt', type: 'timestamp with time zone', default: 'NOW()' },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'dashboards',
      new TableForeignKey({
        columnNames: ['ownerId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createTable(
      new Table({
        name: 'visualizations',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'title', type: 'varchar' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'type', type: 'enum', enum: Object.values(VisualizationType) },
          { name: 'config', type: 'jsonb', isNullable: true },
          { name: 'query', type: 'jsonb', isNullable: true },
          { name: 'dashboardId', type: 'uuid' },
          { name: 'dataSourceId', type: 'uuid', isNullable: true },
          { name: 'createdAt', type: 'timestamp with time zone', default: 'NOW()' },
          { name: 'updatedAt', type: 'timestamp with time zone', default: 'NOW()' },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'visualizations',
      new TableForeignKey({
        columnNames: ['dashboardId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'dashboards',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'visualizations',
      new TableForeignKey({
        columnNames: ['dataSourceId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'data_sources',
        onDelete: 'SET NULL', // If data source is deleted, set dataSourceId to NULL
      })
    );

    // Add indexes for common lookups
    await queryRunner.createIndex('users', {
        columnNames: ['email'],
        isUnique: true
    });
    await queryRunner.createIndex('users', {
        columnNames: ['username'],
        isUnique: true
    });
    await queryRunner.createIndex('dashboards', {
        columnNames: ['ownerId']
    });
    await queryRunner.createIndex('data_sources', {
        columnNames: ['ownerId']
    });
    await queryRunner.createIndex('visualizations', {
        columnNames: ['dashboardId']
    });
    await queryRunner.createIndex('visualizations', {
        columnNames: ['dataSourceId']
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('visualizations');
    await queryRunner.dropTable('dashboards');
    await queryRunner.dropTable('data_sources');
    await queryRunner.dropTable('users');
  }
}