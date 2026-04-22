```typescript
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableUnique } from "typeorm";

export class InitialSchema1701000000001 implements MigrationInterface {
    name = 'InitialSchema1701000000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "users",
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
                    name: "password",
                    type: "varchar",
                    isNullable: false
                },
                {
                    name: "role",
                    type: "varchar",
                    default: "'user'"
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

        await queryRunner.createTable(new Table({
            name: "data_sources",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()"
                },
                {
                    name: "name",
                    type: "varchar",
                    isNullable: false
                },
                {
                    name: "type",
                    type: "enum",
                    enum: ["postgresql", "mysql", "mongodb", "csv_upload"],
                    default: "'postgresql'",
                    isNullable: false
                },
                {
                    name: "connectionDetails",
                    type: "jsonb",
                    isNullable: true
                },
                {
                    name: "userId",
                    type: "uuid",
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

        await queryRunner.createForeignKey("data_sources", new TableForeignKey({
            columnNames: ["userId"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "CASCADE"
        }));

        await queryRunner.createTable(new Table({
            name: "dashboards",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()"
                },
                {
                    name: "name",
                    type: "varchar",
                    isNullable: false
                },
                {
                    name: "description",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "userId",
                    type: "uuid",
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

        await queryRunner.createForeignKey("dashboards", new TableForeignKey({
            columnNames: ["userId"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "CASCADE"
        }));

        await queryRunner.createTable(new Table({
            name: "charts",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()"
                },
                {
                    name: "name",
                    type: "varchar",
                    isNullable: false
                },
                {
                    name: "type",
                    type: "enum",
                    enum: ["bar", "line", "pie", "scatter", "table"],
                    default: "'bar'",
                    isNullable: false
                },
                {
                    name: "configuration",
                    type: "jsonb",
                    isNullable: false
                },
                {
                    name: "query",
                    type: "text",
                    isNullable: false
                },
                {
                    name: "dashboardId",
                    type: "uuid",
                    isNullable: false
                },
                {
                    name: "dataSourceId",
                    type: "uuid",
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

        await queryRunner.createForeignKey("charts", new TableForeignKey({
            columnNames: ["dashboardId"],
            referencedColumnNames: ["id"],
            referencedTableName: "dashboards",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("charts", new TableForeignKey({
            columnNames: ["dataSourceId"],
            referencedColumnNames: ["id"],
            referencedTableName: "data_sources",
            onDelete: "RESTRICT" // Prevent deleting data source if charts depend on it
        }));

        // Add indexes for common queries
        await queryRunner.createIndex("users", {
            columnNames: ["email"],
            isUnique: true
        });
        await queryRunner.createIndex("dashboards", {
            columnNames: ["userId"]
        });
        await queryRunner.createIndex("charts", {
            columnNames: ["dashboardId"]
        });
        await queryRunner.createIndex("charts", {
            columnNames: ["dataSourceId"]
        });
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("charts");
        await queryRunner.dropTable("dashboards");
        await queryRunner.dropTable("data_sources");
        await queryRunner.dropTable("users");
    }
}
```