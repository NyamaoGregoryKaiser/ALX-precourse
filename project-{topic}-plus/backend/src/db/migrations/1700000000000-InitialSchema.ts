import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class InitialSchema1700000000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "users",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    default: "gen_random_uuid()"
                },
                {
                    name: "username",
                    type: "varchar",
                    length: "50",
                    isUnique: true,
                    isNullable: false
                },
                {
                    name: "email",
                    type: "varchar",
                    length: "100",
                    isUnique: true,
                    isNullable: false
                },
                {
                    name: "password_hash",
                    type: "varchar",
                    isNullable: false
                },
                {
                    name: "role",
                    type: "enum",
                    enum: ["admin", "user"],
                    default: "'user'",
                    isNullable: false
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "now()"
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    default: "now()"
                }
            ]
        }), true);

        await queryRunner.createTable(new Table({
            name: "scrapers",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    default: "gen_random_uuid()"
                },
                {
                    name: "name",
                    type: "varchar",
                    length: "100",
                    isUnique: true,
                    isNullable: false
                },
                {
                    name: "description",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "start_url",
                    type: "varchar",
                    length: "2048",
                    isNullable: false
                },
                {
                    name: "selectors_config",
                    type: "jsonb",
                    isNullable: false,
                    comment: "JSON object defining CSS selectors for data extraction"
                },
                {
                    name: "pagination_config",
                    type: "jsonb",
                    isNullable: true,
                    comment: "JSON object defining pagination strategy (e.g., next button selector)"
                },
                {
                    name: "user_id",
                    type: "uuid",
                    isNullable: false
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "now()"
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    default: "now()"
                }
            ]
        }), true);

        await queryRunner.createForeignKey("scrapers", new TableForeignKey({
            columnNames: ["user_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "CASCADE"
        }));
        await queryRunner.createIndex("scrapers", new TableIndex({
            columnNames: ["user_id"]
        }));

        await queryRunner.createTable(new Table({
            name: "scrape_jobs",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    default: "gen_random_uuid()"
                },
                {
                    name: "scraper_id",
                    type: "uuid",
                    isNullable: false
                },
                {
                    name: "user_id",
                    type: "uuid",
                    isNullable: false
                },
                {
                    name: "status",
                    type: "enum",
                    enum: ["pending", "running", "completed", "failed", "scheduled"],
                    default: "'pending'",
                    isNullable: false
                },
                {
                    name: "started_at",
                    type: "timestamp",
                    isNullable: true
                },
                {
                    name: "completed_at",
                    type: "timestamp",
                    isNullable: true
                },
                {
                    name: "log",
                    type: "text",
                    isNullable: true,
                    comment: "Detailed execution log or error messages"
                },
                {
                    name: "extracted_count",
                    type: "int",
                    default: 0
                },
                {
                    name: "scheduled_at",
                    type: "timestamp",
                    isNullable: true,
                    comment: "When the job is planned to run (for recurring jobs)"
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "now()"
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    default: "now()"
                }
            ]
        }), true);

        await queryRunner.createForeignKey("scrape_jobs", new TableForeignKey({
            columnNames: ["scraper_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "scrapers",
            onDelete: "CASCADE"
        }));
        await queryRunner.createIndex("scrape_jobs", new TableIndex({
            columnNames: ["scraper_id"]
        }));

        await queryRunner.createForeignKey("scrape_jobs", new TableForeignKey({
            columnNames: ["user_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "CASCADE"
        }));
        await queryRunner.createIndex("scrape_jobs", new TableIndex({
            columnNames: ["user_id"]
        }));


        await queryRunner.createTable(new Table({
            name: "scraped_data",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    default: "gen_random_uuid()"
                },
                {
                    name: "scrape_job_id",
                    type: "uuid",
                    isNullable: false
                },
                {
                    name: "scraper_id",
                    type: "uuid",
                    isNullable: false
                },
                {
                    name: "data",
                    type: "jsonb",
                    isNullable: false,
                    comment: "The actual scraped data as a JSON object"
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "now()"
                }
            ]
        }), true);

        await queryRunner.createForeignKey("scraped_data", new TableForeignKey({
            columnNames: ["scrape_job_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "scrape_jobs",
            onDelete: "CASCADE"
        }));
        await queryRunner.createIndex("scraped_data", new TableIndex({
            columnNames: ["scrape_job_id"]
        }));

        await queryRunner.createIndex("scraped_data", new TableIndex({
            columnNames: ["scraper_id"]
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("scraped_data");
        await queryRunner.dropTable("scrape_jobs");
        await queryRunner.dropTable("scrapers");
        await queryRunner.dropTable("users");
    }
}