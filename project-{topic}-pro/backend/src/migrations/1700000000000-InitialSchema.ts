import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class InitialSchema1700000000000 implements MigrationInterface {
    name = 'InitialSchema1700000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "users",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
                { name: "username", type: "varchar", isUnique: true },
                { name: "email", type: "varchar", isUnique: true },
                { name: "password", type: "varchar" },
                { name: "role", type: "enum", enum: ["admin", "member"], default: "'member'" },
                { name: "created_at", type: "timestamp", default: "now()" },
                { name: "updated_at", type: "timestamp", default: "now()" }
            ]
        }), true);

        await queryRunner.createTable(new Table({
            name: "workspaces",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
                { name: "name", type: "varchar" },
                { name: "description", type: "text", isNullable: true },
                { name: "owner_id", type: "uuid" },
                { name: "created_at", type: "timestamp", default: "now()" },
                { name: "updated_at", type: "timestamp", default: "now()" }
            ]
        }), true);

        await queryRunner.createForeignKey("workspaces", new TableForeignKey({
            columnNames: ["owner_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "CASCADE"
        }));

        await queryRunner.createTable(new Table({
            name: "projects",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
                { name: "name", type: "varchar" },
                { name: "description", type: "text", isNullable: true },
                { name: "workspace_id", type: "uuid" },
                { name: "owner_id", type: "uuid", isNullable: true },
                { name: "created_at", type: "timestamp", default: "now()" },
                { name: "updated_at", type: "timestamp", default: "now()" }
            ]
        }), true);

        await queryRunner.createForeignKey("projects", new TableForeignKey({
            columnNames: ["workspace_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "workspaces",
            onDelete: "CASCADE"
        }));
        await queryRunner.createForeignKey("projects", new TableForeignKey({
            columnNames: ["owner_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "SET NULL"
        }));

        await queryRunner.createTable(new Table({
            name: "tags",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
                { name: "name", type: "varchar", isUnique: true },
                { name: "color", type: "varchar", isNullable: true },
                { name: "created_at", type: "timestamp", default: "now()" },
                { name: "updated_at", type: "timestamp", default: "now()" }
            ]
        }), true);

        await queryRunner.createTable(new Table({
            name: "tasks",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
                { name: "title", type: "varchar" },
                { name: "description", type: "text", isNullable: true },
                { name: "status", type: "enum", enum: ["open", "in_progress", "review", "closed", "archived"], default: "'open'" },
                { name: "priority", type: "enum", enum: ["low", "medium", "high", "critical"], default: "'medium'" },
                { name: "due_date", type: "timestamp", isNullable: true },
                { name: "project_id", type: "uuid" },
                { name: "assignee_id", type: "uuid", isNullable: true },
                { name: "created_at", type: "timestamp", default: "now()" },
                { name: "updated_at", type: "timestamp", default: "now()" }
            ]
        }), true);

        await queryRunner.createForeignKey("tasks", new TableForeignKey({
            columnNames: ["project_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "projects",
            onDelete: "CASCADE"
        }));
        await queryRunner.createForeignKey("tasks", new TableForeignKey({
            columnNames: ["assignee_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "SET NULL"
        }));

        await queryRunner.createTable(new Table({
            name: "comments",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
                { name: "content", type: "text" },
                { name: "task_id", type: "uuid" },
                { name: "author_id", type: "uuid", isNullable: true },
                { name: "created_at", type: "timestamp", default: "now()" },
                { name: "updated_at", type: "timestamp", default: "now()" }
            ]
        }), true);

        await queryRunner.createForeignKey("comments", new TableForeignKey({
            columnNames: ["task_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "tasks",
            onDelete: "CASCADE"
        }));
        await queryRunner.createForeignKey("comments", new TableForeignKey({
            columnNames: ["author_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "SET NULL"
        }));

        await queryRunner.createTable(new Table({
            name: "task_tags",
            columns: [
                { name: "task_id", type: "uuid", isPrimary: true },
                { name: "tag_id", type: "uuid", isPrimary: true }
            ]
        }), true);

        await queryRunner.createForeignKey("task_tags", new TableForeignKey({
            columnNames: ["task_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "tasks",
            onDelete: "CASCADE"
        }));
        await queryRunner.createForeignKey("task_tags", new TableForeignKey({
            columnNames: ["tag_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "tags",
            onDelete: "CASCADE"
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("task_tags");
        await queryRunner.dropTable("comments");
        await queryRunner.dropTable("tasks");
        await queryRunner.dropTable("tags");
        await queryRunner.dropTable("projects");
        await queryRunner.dropTable("workspaces");
        await queryRunner.dropTable("users");
    }
}