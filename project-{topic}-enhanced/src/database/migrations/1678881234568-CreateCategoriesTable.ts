```typescript
import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateCategoriesTable1678881234568 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'categories',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: 50,
            isNullable: false,
          },
          {
            name: 'description',
            type: 'varchar',
            length: 255,
            isNullable: true,
          },
          {
            name: 'userId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign key constraint to link categories to users
    await queryRunner.createForeignKey(
      'categories',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE', // If a user is deleted, their categories are also deleted
      }),
    );

    // Add unique constraint for name and userId
    await queryRunner.createUniqueConstraint(
      'categories',
      new Table({ name: 'unique_category_name_per_user', columns: ['name', 'userId'] })
        .uniques[0],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique constraint first
    await queryRunner.dropConstraint('categories', 'unique_category_name_per_user');
    // Drop the foreign key constraint
    const table = await queryRunner.getTable('categories');
    const foreignKey = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('userId') !== -1,
    );
    await queryRunner.dropForeignKey('categories', foreignKey);
    // Drop the table
    await queryRunner.dropTable('categories');
  }
}
```