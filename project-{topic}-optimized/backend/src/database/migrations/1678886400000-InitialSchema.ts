```typescript
import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from "typeorm";

export class InitialSchema1678886400000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "users",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
                { name: "username", type: "varchar", length: "255", isUnique: true, isNullable: false },
                { name: "email", type: "varchar", length: "255", isUnique: true, isNullable: false },
                { name: "password", type: "varchar", length: "255", isNullable: false },
                { name: "role", type: "enum", enum: ["USER", "MERCHANT", "ADMIN"], default: "'USER'", isNullable: false },
                { name: "createdAt", type: "timestamptz", default: "CURRENT_TIMESTAMP", isNullable: false },
                { name: "updatedAt", type: "timestamptz", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP", isNullable: false },
            ]
        }), true);

        await queryRunner.createTable(new Table({
            name: "merchants",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
                { name: "name", type: "varchar", length: "255", isUnique: true, isNullable: false },
                { name: "businessEmail", type: "varchar", length: "255", isUnique: true, isNullable: true },
                { name: "address", type: "varchar", length: "500", isNullable: true },
                { name: "isActive", type: "boolean", default: true, isNullable: false },
                { name: "balance", type: "decimal", precision: 10, scale: 2, default: "0.00", isNullable: false },
                { name: "userId", type: "uuid", isNullable: false }, // Foreign key to User
                { name: "createdAt", type: "timestamptz", default: "CURRENT_TIMESTAMP", isNullable: false },
                { name: "updatedAt", type: "timestamptz", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP", isNullable: false },
            ]
        }), true);

        await queryRunner.createForeignKey("merchants", new TableForeignKey({
            columnNames: ["userId"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "CASCADE",
        }));

        await queryRunner.createTable(new Table({
            name: "accounts",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
                { name: "bankName", type: "varchar", length: "255", isNullable: false },
                { name: "accountNumber", type: "varchar", length: "255", isNullable: false },
                { name: "routingNumber", type: "varchar", length: "255", isNullable: true },
                { name: "type", type: "enum", enum: ["CHECKING", "SAVINGS", "BUSINESS"], default: "'CHECKING'", isNullable: false },
                { name: "isActive", type: "boolean", default: true, isNullable: false },
                { name: "isPrimary", type: "boolean", default: false, isNullable: false },
                { name: "merchantId", type: "uuid", isNullable: false }, // Foreign key to Merchant
                { name: "createdAt", type: "timestamptz", default: "CURRENT_TIMESTAMP", isNullable: false },
                { name: "updatedAt", type: "timestamptz", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP", isNullable: false },
            ]
        }), true);

        await queryRunner.createForeignKey("accounts", new TableForeignKey({
            columnNames: ["merchantId"],
            referencedColumnNames: ["id"],
            referencedTableName: "merchants",
            onDelete: "CASCADE",
        }));

        await queryRunner.createTable(new Table({
            name: "transactions",
            columns: [
                { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
                { name: "amount", type: "decimal", precision: 10, scale: 2, isNullable: false },
                { name: "currency", type: "varchar", length: "3", isNullable: false },
                { name: "type", type: "enum", enum: ["PAYMENT", "REFUND", "WITHDRAWAL", "DEPOSIT"], isNullable: false },
                { name: "status", type: "enum", enum: ["PENDING", "COMPLETED", "FAILED", "REFUNDED", "CANCELLED"], default: "'PENDING'", isNullable: false },
                { name: "description", type: "varchar", length: "255", isNullable: true },
                { name: "externalTransactionId", type: "varchar", length: "255", isUnique: true, isNullable: true },
                { name: "metadata", type: "jsonb", isNullable: true },
                { name: "processedAt", type: "timestamptz", isNullable: true },
                { name: "failureReason", type: "varchar", length: "500", isNullable: true },
                { name: "initiatorUserId", type: "uuid", isNullable: false }, // Foreign key to User (payer)
                { name: "merchantId", type: "uuid", isNullable: false }, // Foreign key to Merchant (receiver)
                { name: "createdAt", type: "timestamptz", default: "CURRENT_TIMESTAMP", isNullable: false },
                { name: "updatedAt", type: "timestamptz", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP", isNullable: false },
            ]
        }), true);

        await queryRunner.createForeignKey("transactions", new TableForeignKey({
            columnNames: ["initiatorUserId"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "RESTRICT", // Prevent user deletion if they have transactions
        }));

        await queryRunner.createForeignKey("transactions", new TableForeignKey({
            columnNames: ["merchantId"],
            referencedColumnNames: ["id"],
            referencedTableName: "merchants",
            onDelete: "RESTRICT", // Prevent merchant deletion if they have transactions
        }));

        // Add indexes for common lookup fields to improve query performance
        await queryRunner.createIndex("transactions", new TableIndex({
            columnNames: ["merchantId", "status", "createdAt"]
        }));
        await queryRunner.createIndex("transactions", new TableIndex({
            columnNames: ["initiatorUserId", "createdAt"]
        }));
        await queryRunner.createIndex("transactions", new TableIndex({
            columnNames: ["externalTransactionId"],
            isUnique: true,
            where: `"externalTransactionId" IS NOT NULL` // Index only non-null values
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("transactions");
        await queryRunner.dropTable("accounts");
        await queryRunner.dropTable("merchants");
        await queryRunner.dropTable("users");
    }
}
```