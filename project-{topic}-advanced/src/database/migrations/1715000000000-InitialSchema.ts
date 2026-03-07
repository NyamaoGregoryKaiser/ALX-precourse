```typescript
import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";
import { UserRole, DataSourceType, ChartType } from '../entities/index'; // Adjust path if needed

export class InitialSchema1715000000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Users Table
        await queryRunner.createTable(new Table({
            name: "users",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
                { name: "email", type: "varchar", length: "255", isUnique: true },
                { name: "password", type: "varchar", length: "255" },
                { name: "role", type: "enum", enum: Object.values(UserRole), default: `'${UserRole.USER}'` },
                { name: "created_at", type: "timestamp", default: "now()" },
                { name: "updated_at", type: "timestamp", default: "now()" }
            ]
        }), true);

        // Data Sources Table
        await queryRunner.createTable(new Table({
            name: "data_sources",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
                { name: "name", type: "varchar", length: "255" },
                { name: "type", type: "enum", enum: Object.values(DataSourceType) },
                { name: "connection_config", type: "jsonb", isNullable: true },
                { name: "description", type: "text", isNullable: true },
                { name: "user_id", type: "uuid" },
                { name: "created_at", type: "timestamp", default: "now()" },
                { name: "updated_at", type: "timestamp", default: "now()" }
            ]
        }), true);

        await queryRunner.createForeignKey("data_sources", new TableForeignKey({
            columnNames: ["user_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "CASCADE"
        }));

        // Dashboards Table
        await queryRunner.createTable(new Table({
            name: "dashboards",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
                { name: "name", type: "varchar", length: "255" },
                { name: "description", type: "text", isNullable: true },
                { name: "layout", type: "jsonb", isNullable: true },
                { name: "user_id", type: "uuid" },
                { name: "created_at", type: "timestamp", default: "now()" },
                { name: "updated_at", type: "timestamp", default: "now()" }
            ]
        }), true);

        await queryRunner.createForeignKey("dashboards", new TableForeignKey({
            columnNames: ["user_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "CASCADE"
        }));

        // Datasets Table
        await queryRunner.createTable(new Table({
            name: "datasets",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
                { name: "name", type: "varchar", length: "255" },
                { name: "query", type: "text" },
                { name: "schema", type: "jsonb", isNullable: true },
                { name: "description", type: "text", isNullable: true },
                { name: "data_source_id", type: "uuid" },
                { name: "created_at", type: "timestamp", default: "now()" },
                { name: "updated_at", type: "timestamp", default: "now()" }
            ]
        }), true);

        await queryRunner.createForeignKey("datasets", new TableForeignKey({
            columnNames: ["data_source_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "data_sources",
            onDelete: "CASCADE"
        }));

        // Visualizations Table
        await queryRunner.createTable(new Table({
            name: "visualizations",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
                { name: "name", type: "varchar", length: "255" },
                { name: "chart_type", type: "enum", enum: Object.values(ChartType) },
                { name: "configuration", type: "jsonb" },
                { name: "data_mapping", type: "jsonb", isNullable: true },
                { name: "description", type: "text", isNullable: true },
                { name: "dataset_id", type: "uuid" },
                { name: "dashboard_id", type: "uuid", isNullable: true }, // Optional: Can exist without a dashboard
                { name: "created_at", type: "timestamp", default: "now()" },
                { name: "updated_at", type: "timestamp", default: "now()" }
            ]
        }), true);

        await queryRunner.createForeignKey("visualizations", new TableForeignKey({
            columnNames: ["dataset_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "datasets",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("visualizations", new TableForeignKey({
            columnNames: ["dashboard_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "dashboards",
            onDelete: "SET NULL" // Visualizations can exist without a dashboard
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("visualizations");
        await queryRunner.dropTable("datasets");
        await queryRunner.dropTable("dashboards");
        await queryRunner.dropTable("data_sources");
        await queryRunner.dropTable("users");
    }

}
```