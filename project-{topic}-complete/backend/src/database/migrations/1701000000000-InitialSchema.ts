import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";
import { Role } from "../../common/enums/role.enum";

export class InitialSchema1701000000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "users",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    default: "uuid_generate_v4()"
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
                    name: "password",
                    type: "varchar",
                    isNullable: false
                },
                {
                    name: "role",
                    type: "enum",
                    enum: Object.values(Role),
                    default: `'${Role.User}'`,
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
            name: "datasets",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    default: "uuid_generate_v4()"
                },
                {
                    name: "name",
                    type: "varchar",
                    length: "255",
                    isNullable: false
                },
                {
                    name: "description",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "file_path",
                    type: "varchar",
                    length: "255",
                    isNullable: false
                },
                {
                    name: "file_name",
                    type: "varchar",
                    length: "255",
                    isNullable: false
                },
                {
                    name: "file_type",
                    type: "varchar",
                    length: "50",
                    isNullable: false
                },
                {
                    name: "file_size_bytes",
                    type: "bigint",
                    isNullable: false
                },
                {
                    name: "created_by_id",
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

        await queryRunner.createForeignKey("datasets", new TableForeignKey({
            columnNames: ["created_by_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "CASCADE"
        }));

        await queryRunner.createTable(new Table({
            name: "models",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    default: "uuid_generate_v4()"
                },
                {
                    name: "name",
                    type: "varchar",
                    length: "255",
                    isNullable: false
                },
                {
                    name: "description",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "version",
                    type: "varchar",
                    length: "50",
                    isNullable: false
                },
                {
                    name: "file_path",
                    type: "varchar",
                    length: "255",
                    isNullable: false
                },
                {
                    name: "file_name",
                    type: "varchar",
                    length: "255",
                    isNullable: false
                },
                {
                    name: "file_type",
                    type: "varchar",
                    length: "50",
                    isNullable: false
                },
                {
                    name: "file_size_bytes",
                    type: "bigint",
                    isNullable: false
                },
                {
                    name: "deployed",
                    type: "boolean",
                    default: false,
                    isNullable: false
                },
                {
                    name: "deployment_url",
                    type: "varchar",
                    length: "255",
                    isNullable: true
                },
                {
                    name: "created_by_id",
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

        await queryRunner.createForeignKey("models", new TableForeignKey({
            columnNames: ["created_by_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "CASCADE"
        }));

        await queryRunner.createTable(new Table({
            name: "prediction_logs",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    default: "uuid_generate_v4()"
                },
                {
                    name: "model_id",
                    type: "uuid",
                    isNullable: false
                },
                {
                    name: "input_data",
                    type: "jsonb",
                    isNullable: false
                },
                {
                    name: "output_data",
                    type: "jsonb",
                    isNullable: false
                },
                {
                    name: "requested_by_id",
                    type: "uuid",
                    isNullable: true // Can be null for public models
                },
                {
                    name: "requested_at",
                    type: "timestamp",
                    default: "now()"
                }
            ]
        }), true);

        await queryRunner.createForeignKey("prediction_logs", new TableForeignKey({
            columnNames: ["model_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "models",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("prediction_logs", new TableForeignKey({
            columnNames: ["requested_by_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "SET NULL" // If user is deleted, keep log but set requested_by_id to null
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropForeignKey("prediction_logs", "FK_prediction_logs_requested_by_id");
        await queryRunner.dropForeignKey("prediction_logs", "FK_prediction_logs_model_id");
        await queryRunner.dropTable("prediction_logs");

        await queryRunner.dropForeignKey("models", "FK_models_created_by_id");
        await queryRunner.dropTable("models");

        await queryRunner.dropForeignKey("datasets", "FK_datasets_created_by_id");
        await queryRunner.dropTable("datasets");

        await queryRunner.dropTable("users");
    }
}