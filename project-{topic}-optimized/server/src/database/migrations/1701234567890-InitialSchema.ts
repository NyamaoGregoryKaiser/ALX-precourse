import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class InitialSchema1701234567890 implements MigrationInterface {
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
            type: 'varchar',
            length: '50',
            default: "'user'",
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'datasets',
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
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'version',
            type: 'varchar',
            length: '50',
            default: "'1.0.0'",
            isNullable: false,
          },
          {
            name: 'schemaJson',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'fileUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'uploadedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'createdById',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'datasets',
      new TableIndex({
        name: 'IDX_DATASET_NAME',
        columnNames: ['name'],
      }),
    );

    await queryRunner.createForeignKey(
      'datasets',
      new TableForeignKey({
        columnNames: ['createdById'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'ml_models',
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
            name: 'version',
            type: 'varchar',
            length: '50',
            default: "'1.0.0'",
            isNullable: false,
          },
          {
            name: 'framework',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metricsJson',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'hyperparametersJson',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'trainedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'datasetId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'createdById',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'ml_models',
      new TableIndex({
        name: 'IDX_MLMODEL_NAME',
        columnNames: ['name'],
      }),
    );

    await queryRunner.createIndex(
      'ml_models',
      new TableIndex({
        name: 'IDX_MLMODEL_DATASET_ID',
        columnNames: ['datasetId'],
      }),
    );

    await queryRunner.createForeignKey(
      'ml_models',
      new TableForeignKey({
        columnNames: ['datasetId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'datasets',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'ml_models',
      new TableForeignKey({
        columnNames: ['createdById'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'experiment_runs',
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
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'runAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'parametersJson',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metricsJson',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'artifactsUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'modelId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'datasetId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'createdById',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'experiment_runs',
      new TableIndex({
        name: 'IDX_EXPERIMENT_NAME',
        columnNames: ['name'],
      }),
    );

    await queryRunner.createIndex(
      'experiment_runs',
      new TableIndex({
        name: 'IDX_EXPERIMENT_MODEL_ID',
        columnNames: ['modelId'],
      }),
    );

    await queryRunner.createIndex(
      'experiment_runs',
      new TableIndex({
        name: 'IDX_EXPERIMENT_DATASET_ID',
        columnNames: ['datasetId'],
      }),
    );

    await queryRunner.createForeignKey(
      'experiment_runs',
      new TableForeignKey({
        columnNames: ['modelId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'ml_models',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'experiment_runs',
      new TableForeignKey({
        columnNames: ['datasetId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'datasets',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'experiment_runs',
      new TableForeignKey({
        columnNames: ['createdById'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('experiment_runs', 'FK_EXPERIMENT_USER');
    await queryRunner.dropForeignKey('experiment_runs', 'FK_EXPERIMENT_DATASET');
    await queryRunner.dropForeignKey('experiment_runs', 'FK_EXPERIMENT_MODEL');
    await queryRunner.dropIndex('experiment_runs', 'IDX_EXPERIMENT_DATASET_ID');
    await queryRunner.dropIndex('experiment_runs', 'IDX_EXPERIMENT_MODEL_ID');
    await queryRunner.dropIndex('experiment_runs', 'IDX_EXPERIMENT_NAME');
    await queryRunner.dropTable('experiment_runs');

    await queryRunner.dropForeignKey('ml_models', 'FK_MLMODEL_USER');
    await queryRunner.dropForeignKey('ml_models', 'FK_MLMODEL_DATASET');
    await queryRunner.dropIndex('ml_models', 'IDX_MLMODEL_DATASET_ID');
    await queryRunner.dropIndex('ml_models', 'IDX_MLMODEL_NAME');
    await queryRunner.dropTable('ml_models');

    await queryRunner.dropForeignKey('datasets', 'FK_DATASET_USER');
    await queryRunner.dropIndex('datasets', 'IDX_DATASET_NAME');
    await queryRunner.dropTable('datasets');

    await queryRunner.dropTable('users');
  }
}
```