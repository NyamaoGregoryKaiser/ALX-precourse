```typescript
import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class InitialSchema1701100000000 implements MigrationInterface {
    name = 'InitialSchema1701100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create User table
        await queryRunner.createTable(new Table({
            name: "user",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()"
                },
                {
                    name: "email",
                    type: "varchar",
                    isUnique: true,
                    isNullable: false
                },
                {
                    name: "firstName",
                    type: "varchar",
                    isNullable: true
                },
                {
                    name: "lastName",
                    type: "varchar",
                    isNullable: true
                },
                {
                    name: "passwordHash",
                    type: "varchar",
                    isNullable: false
                },
                {
                    name: "role",
                    type: "enum",
                    enum: ["admin", "editor", "author", "subscriber"],
                    default: "'subscriber'",
                    isNullable: false
                },
                {
                    name: "createdAt",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP"
                },
                {
                    name: "updatedAt",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP"
                }
            ]
        }), true);

        // Create Post table
        await queryRunner.createTable(new Table({
            name: "post",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()"
                },
                {
                    name: "title",
                    type: "varchar",
                    length: "255",
                    isNullable: false
                },
                {
                    name: "content",
                    type: "text",
                    isNullable: false
                },
                {
                    name: "slug",
                    type: "varchar",
                    isUnique: true,
                    isNullable: false
                },
                {
                    name: "status",
                    type: "enum",
                    enum: ["draft", "published", "archived"],
                    default: "'draft'",
                    isNullable: false
                },
                {
                    name: "authorId",
                    type: "uuid",
                    isNullable: true // Can be null if author is deleted
                },
                {
                    name: "createdAt",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP"
                },
                {
                    name: "updatedAt",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP"
                }
            ]
        }), true);

        // Add foreign key to Post table for author
        await queryRunner.createForeignKey("post", new TableForeignKey({
            columnNames: ["authorId"],
            referencedColumnNames: ["id"],
            referencedTableName: "user",
            onDelete: "SET NULL" // If an author is deleted, set authorId to null
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key first
        const postTable = await queryRunner.getTable("post");
        const foreignKey = postTable.foreignKeys.find(fk => fk.columnNames.indexOf("authorId") !== -1);
        await queryRunner.dropForeignKey("post", foreignKey);

        // Drop tables in reverse order of creation
        await queryRunner.dropTable("post");
        await queryRunner.dropTable("user");
    }
}
```