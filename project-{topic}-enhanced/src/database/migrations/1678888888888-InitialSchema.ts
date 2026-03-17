```typescript
import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

/**
 * @file Initial database schema migration.
 *
 * This migration creates the `users`, `projects`, `scraping_tasks`, and
 * `scraping_results` tables with their respective columns, constraints,
 * and foreign key relationships.
 *
 * This timestamp (1678888888888) is a placeholder. When you run
 * `npm run migration:create --name=InitialSchema`, TypeORM will generate
 * a real timestamp.
 */
export class InitialSchema1678888888888 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create 'users' table
        await queryRunner.createTable(
            new Table({
                name: "users",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "uuid",
                        default: "uuid_generate_v4()"
                    },
                    {
                        name: "username",
                        type: "varchar",
                        length: "50",
                        isUnique: true,
                        isNullable: false,
                    },
                    {
                        name: "email",
                        type: "varchar",
                        length: "100",
                        isUnique: true,
                        isNullable: false,
                    },
                    {
                        name: "password",
                        type: "varchar",
                        isNullable: false,
                    },
                    {
                        name: "role",
                        type: "varchar",
                        length: "20",
                        default: "'user'", // 'admin', 'user'
                        isNullable: false,
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "now()",
                        isNullable: false,
                    },
                    {
                        name: "updated_at",
                        type: "timestamp",
                        default: "now()",
                        onUpdate: "now()",
                        isNullable: false,
                    },
                ],
            }),
            true
        );

        // Create 'projects' table
        await queryRunner.createTable(
            new Table({
                name: "projects",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "uuid",
                        default: "uuid_generate_v4()"
                    },
                    {
                        name: "name",
                        type: "varchar",
                        length: "100",
                        isUnique: true,
                        isNullable: false,
                    },
                    {
                        name: "description",
                        type: "text",
                        isNullable: true,
                    },
                    {
                        name: "user_id",
                        type: "uuid",
                        isNullable: false,
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "now()",
                        isNullable: false,
                    },
                    {
                        name: "updated_at",
                        type: "timestamp",
                        default: "now()",
                        onUpdate: "now()",
                        isNullable: false,
                    },
                ],
            }),
            true
        );

        // Add foreign key for 'projects' to 'users'
        await queryRunner.createForeignKey(
            "projects",
            new TableForeignKey({
                columnNames: ["user_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "users",
                onDelete: "CASCADE",
            })
        );

        // Create 'scraping_tasks' table
        await queryRunner.createTable(
            new Table({
                name: "scraping_tasks",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "uuid",
                        default: "uuid_generate_v4()"
                    },
                    {
                        name: "project_id",
                        type: "uuid",
                        isNullable: false,
                    },
                    {
                        name: "target_url",
                        type: "varchar",
                        length: "255",
                        isNullable: false,
                    },
                    {
                        name: "selectors",
                        type: "jsonb", // Store an array of objects { name: 'title', selector: 'h1' }
                        isNullable: false,
                    },
                    {
                        name: "status",
                        type: "varchar",
                        length: "20",
                        default: "'pending'", // 'pending', 'running', 'completed', 'failed', 'cancelled'
                        isNullable: false,
                    },
                    {
                        name: "schedule_interval",
                        type: "varchar",
                        length: "50",
                        isNullable: true, // e.g., 'daily', 'weekly', '*/5 * * * *' (cron)
                    },
                    {
                        name: "last_run_at",
                        type: "timestamp",
                        isNullable: true,
                    },
                    {
                        name: "next_run_at",
                        type: "timestamp",
                        isNullable: true,
                    },
                    {
                        name: "headless",
                        type: "boolean",
                        default: true,
                        isNullable: false
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "now()",
                        isNullable: false,
                    },
                    {
                        name: "updated_at",
                        type: "timestamp",
                        default: "now()",
                        onUpdate: "now()",
                        isNullable: false,
                    },
                ],
            }),
            true
        );

        // Add foreign key for 'scraping_tasks' to 'projects'
        await queryRunner.createForeignKey(
            "scraping_tasks",
            new TableForeignKey({
                columnNames: ["project_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "projects",
                onDelete: "CASCADE",
            })
        );

        // Create 'scraping_results' table
        await queryRunner.createTable(
            new Table({
                name: "scraping_results",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "uuid",
                        default: "uuid_generate_v4()"
                    },
                    {
                        name: "task_id",
                        type: "uuid",
                        isNullable: false,
                    },
                    {
                        name: "project_id",
                        type: "uuid",
                        isNullable: false,
                    },
                    {
                        name: "data",
                        type: "jsonb", // Store the scraped data as JSON
                        isNullable: false,
                    },
                    {
                        name: "scraped_at",
                        type: "timestamp",
                        default: "now()",
                        isNullable: false,
                    },
                    {
                        name: "status",
                        type: "varchar",
                        length: "20",
                        default: "'success'", // 'success', 'failed'
                        isNullable: false,
                    },
                    {
                        name: "error_message",
                        type: "text",
                        isNullable: true,
                    },
                ],
            }),
            true
        );

        // Add foreign key for 'scraping_results' to 'scraping_tasks'
        await queryRunner.createForeignKey(
            "scraping_results",
            new TableForeignKey({
                columnNames: ["task_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "scraping_tasks",
                onDelete: "CASCADE",
            })
        );

        // Add foreign key for 'scraping_results' to 'projects' (redundant but useful for direct lookup)
        await queryRunner.createForeignKey(
            "scraping_results",
            new TableForeignKey({
                columnNames: ["project_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "projects",
                onDelete: "CASCADE",
            })
        );

        // Create UUID extension if not exists
        await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys first
        await queryRunner.dropForeignKey("scraping_results", "FK_scraping_results_task_id");
        await queryRunner.dropForeignKey("scraping_results", "FK_scraping_results_project_id");
        await queryRunner.dropForeignKey("scraping_tasks", "FK_scraping_tasks_project_id");
        await queryRunner.dropForeignKey("projects", "FK_projects_user_id");

        // Drop tables
        await queryRunner.dropTable("scraping_results");
        await queryRunner.dropTable("scraping_tasks");
        await queryRunner.dropTable("projects");
        await queryRunner.dropTable("users");
    }

}
```