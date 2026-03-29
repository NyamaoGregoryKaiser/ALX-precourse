```typescript
import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class InitialSchema1715000000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create 'users' table
        await queryRunner.createTable(new Table({
            name: 'users',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    default: 'gen_random_uuid()'
                },
                {
                    name: 'email',
                    type: 'varchar',
                    length: '255',
                    isUnique: true,
                    isNullable: false
                },
                {
                    name: 'password',
                    type: 'varchar',
                    length: '255',
                    isNullable: false
                },
                {
                    name: 'role',
                    type: 'varchar',
                    length: '50',
                    default: "'user'"
                },
                {
                    name: 'createdAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP'
                },
                {
                    name: 'updatedAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                    onUpdate: 'CURRENT_TIMESTAMP'
                }
            ]
        }), true);

        // Create 'products' table
        await queryRunner.createTable(new Table({
            name: 'products',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    default: 'gen_random_uuid()'
                },
                {
                    name: 'name',
                    type: 'varchar',
                    length: '255',
                    isUnique: true,
                    isNullable: false
                },
                {
                    name: 'description',
                    type: 'text',
                    isNullable: true
                },
                {
                    name: 'price',
                    type: 'decimal',
                    precision: 10,
                    scale: 2,
                    isNullable: false
                },
                {
                    name: 'isActive',
                    type: 'boolean',
                    default: true
                },
                {
                    name: 'userId',
                    type: 'uuid',
                    isNullable: false
                },
                {
                    name: 'createdAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP'
                },
                {
                    name: 'updatedAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                    onUpdate: 'CURRENT_TIMESTAMP'
                }
            ]
        }), true);

        // Add foreign key constraint to 'products' table referencing 'users'
        await queryRunner.createForeignKey('products', new TableForeignKey({
            columnNames: ['userId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE'
        }));

        // Add index on product name for faster lookups
        await queryRunner.createIndex('products', {
            columnNames: ['name'],
            isUnique: true
        });
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key first
        const productTable = await queryRunner.getTable('products');
        const foreignKey = productTable!.foreignKeys.find(fk => fk.columnNames.indexOf('userId') !== -1);
        if (foreignKey) {
            await queryRunner.dropForeignKey('products', foreignKey);
        }

        // Drop tables in reverse order of creation
        await queryRunner.dropTable('products');
        await queryRunner.dropTable('users');
    }
}
```