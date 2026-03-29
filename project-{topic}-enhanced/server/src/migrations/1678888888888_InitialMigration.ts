import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableUnique } from "typeorm";

export class InitialMigration1678888888888 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Users Table
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
                    name: "password",
                    type: "varchar",
                    length: "255",
                    isNullable: false
                },
                {
                    name: "firstName",
                    type: "varchar",
                    length: "50",
                    isNullable: true
                },
                {
                    name: "lastName",
                    type: "varchar",
                    length: "50",
                    isNullable: true
                },
                {
                    name: "isEmailVerified",
                    type: "boolean",
                    default: false
                },
                {
                    name: "emailVerificationToken",
                    type: "varchar",
                    length: "255",
                    isNullable: true
                },
                {
                    name: "passwordResetToken",
                    type: "varchar",
                    length: "255",
                    isNullable: true
                },
                {
                    name: "passwordResetExpires",
                    type: "timestamp",
                    isNullable: true
                },
                {
                    name: "createdAt",
                    type: "timestamp",
                    default: "now()"
                },
                {
                    name: "updatedAt",
                    type: "timestamp",
                    default: "now()"
                }
            ]
        }), true);

        // Roles Table
        await queryRunner.createTable(new Table({
            name: "roles",
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
                    length: "50",
                    isUnique: true,
                    isNullable: false
                },
                {
                    name: "description",
                    type: "varchar",
                    length: "255",
                    isNullable: true
                },
                {
                    name: "createdAt",
                    type: "timestamp",
                    default: "now()"
                },
                {
                    name: "updatedAt",
                    type: "timestamp",
                    default: "now()"
                }
            ]
        }), true);

        // Permissions Table
        await queryRunner.createTable(new Table({
            name: "permissions",
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
                    length: "50",
                    isUnique: true,
                    isNullable: false
                },
                {
                    name: "description",
                    type: "varchar",
                    length: "255",
                    isNullable: true
                },
                {
                    name: "createdAt",
                    type: "timestamp",
                    default: "now()"
                },
                {
                    name: "updatedAt",
                    type: "timestamp",
                    default: "now()"
                }
            ]
        }), true);

        // UserRoles Join Table
        await queryRunner.createTable(new Table({
            name: "user_roles",
            columns: [
                {
                    name: "userId",
                    type: "uuid",
                    isPrimary: true
                },
                {
                    name: "roleId",
                    type: "uuid",
                    isPrimary: true
                }
            ]
        }), true);

        await queryRunner.createForeignKey("user_roles", new TableForeignKey({
            columnNames: ["userId"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("user_roles", new TableForeignKey({
            columnNames: ["roleId"],
            referencedColumnNames: ["id"],
            referencedTableName: "roles",
            onDelete: "CASCADE"
        }));

        // RolePermissions Join Table
        await queryRunner.createTable(new Table({
            name: "role_permissions",
            columns: [
                {
                    name: "roleId",
                    type: "uuid",
                    isPrimary: true
                },
                {
                    name: "permissionId",
                    type: "uuid",
                    isPrimary: true
                }
            ]
        }), true);

        await queryRunner.createForeignKey("role_permissions", new TableForeignKey({
            columnNames: ["roleId"],
            referencedColumnNames: ["id"],
            referencedTableName: "roles",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("role_permissions", new TableForeignKey({
            columnNames: ["permissionId"],
            referencedColumnNames: ["id"],
            referencedTableName: "permissions",
            onDelete: "CASCADE"
        }));

        // RefreshTokens Table
        await queryRunner.createTable(new Table({
            name: "refresh_tokens",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    default: "gen_random_uuid()"
                },
                {
                    name: "token",
                    type: "varchar",
                    length: "500",
                    isUnique: true,
                    isNullable: false
                },
                {
                    name: "expiresAt",
                    type: "timestamp",
                    isNullable: false
                },
                {
                    name: "isRevoked",
                    type: "boolean",
                    default: false
                },
                {
                    name: "userId",
                    type: "uuid",
                    isNullable: false
                },
                {
                    name: "createdAt",
                    type: "timestamp",
                    default: "now()"
                },
                {
                    name: "updatedAt",
                    type: "timestamp",
                    default: "now()"
                }
            ]
        }), true);

        await queryRunner.createForeignKey("refresh_tokens", new TableForeignKey({
            columnNames: ["userId"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "CASCADE"
        }));

        // Products Table (Example resource)
        await queryRunner.createTable(new Table({
            name: "products",
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
                    name: "price",
                    type: "decimal",
                    precision: 10,
                    scale: 2,
                    isNullable: false
                },
                {
                    name: "stock",
                    type: "integer",
                    default: 0,
                    isNullable: false
                },
                {
                    name: "createdAt",
                    type: "timestamp",
                    default: "now()"
                },
                {
                    name: "updatedAt",
                    type: "timestamp",
                    default: "now()"
                }
            ]
        }), true);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("products");
        await queryRunner.dropTable("refresh_tokens");
        await queryRunner.dropTable("role_permissions");
        await queryRunner.dropTable("user_roles");
        await queryRunner.dropTable("permissions");
        await queryRunner.dropTable("roles");
        await queryRunner.dropTable("users");
    }
}