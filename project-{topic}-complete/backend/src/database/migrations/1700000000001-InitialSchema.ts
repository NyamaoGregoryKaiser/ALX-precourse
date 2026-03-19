```typescript
import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';
import { UserRole } from '../../modules/users/user.entity';
import { OrderStatus } from '../../types'; // Assuming shared types for consistency

export class InitialSchema1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'firstName', type: 'varchar', length: '50' },
          { name: 'lastName', type: 'varchar', length: '50' },
          { name: 'email', type: 'varchar', length: '100', isUnique: true },
          { name: 'password', type: 'varchar' },
          { name: 'role', type: 'enum', enum: Object.values(UserRole), default: `'${UserRole.CUSTOMER}'` },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'categories',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar', length: '100', isUnique: true },
          { name: 'slug', type: 'varchar', length: '100', isUnique: true },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'products',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar', length: '255' },
          { name: 'description', type: 'text' },
          { name: 'price', type: 'decimal', precision: 10, scale: 2 },
          { name: 'stock', type: 'int', default: 0 },
          { name: 'images', type: 'text', isArray: true, isNullable: true, default: 'ARRAY[]::text[]' },
          { name: 'ratingsAverage', type: 'decimal', precision: 3, scale: 2, isNullable: true, default: 0.00 },
          { name: 'ratingsQuantity', type: 'int', isNullable: true, default: 0 },
          { name: 'categoryId', type: 'uuid', isNullable: false },
          { name: 'sellerId', type: 'uuid', isNullable: false }, // User who created/sells the product
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'products',
      new TableForeignKey({
        columnNames: ['categoryId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'categories',
        onDelete: 'RESTRICT',
      })
    );

    await queryRunner.createForeignKey(
      'products',
      new TableForeignKey({
        columnNames: ['sellerId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE', // If seller is deleted, their products are also deleted
      })
    );

    await queryRunner.createTable(
      new Table({
        name: 'reviews',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'rating', type: 'int' },
          { name: 'comment', type: 'text', isNullable: true },
          { name: 'userId', type: 'uuid', isNullable: false },
          { name: 'productId', type: 'uuid', isNullable: false },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'reviews',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'reviews',
      new TableForeignKey({
        columnNames: ['productId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'products',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createTable(
      new Table({
        name: 'carts',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'userId', type: 'uuid', isUnique: true, isNullable: false }, // One user, one cart
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'carts',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createTable(
      new Table({
        name: 'cart_items',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'cartId', type: 'uuid', isNullable: false },
          { name: 'productId', type: 'uuid', isNullable: false },
          { name: 'quantity', type: 'int' },
          { name: 'priceAtAddition', type: 'decimal', precision: 10, scale: 2 }, // Price when added to cart
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'cart_items',
      new TableForeignKey({
        columnNames: ['cartId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'carts',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'cart_items',
      new TableForeignKey({
        columnNames: ['productId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'products',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createTable(
      new Table({
        name: 'orders',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'userId', type: 'uuid', isNullable: false },
          { name: 'totalAmount', type: 'decimal', precision: 10, scale: 2 },
          { name: 'status', type: 'enum', enum: Object.values(OrderStatus), default: `'${OrderStatus.PENDING}'` },
          { name: 'shippingAddressStreet', type: 'varchar' },
          { name: 'shippingAddressCity', type: 'varchar' },
          { name: 'shippingAddressState', type: 'varchar' },
          { name: 'shippingAddressZip', type: 'varchar' },
          { name: 'shippingAddressCountry', type: 'varchar' },
          { name: 'paymentMethod', type: 'varchar' }, // e.g., 'credit_card', 'paypal', 'COD'
          { name: 'paymentStatus', type: 'enum', enum: ['pending', 'completed', 'failed'], default: `'pending'` },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'orders',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'RESTRICT', // Don't delete orders if user is deleted
      })
    );

    await queryRunner.createTable(
      new Table({
        name: 'order_items',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'orderId', type: 'uuid', isNullable: false },
          { name: 'productId', type: 'uuid', isNullable: false },
          { name: 'quantity', type: 'int' },
          { name: 'priceAtOrder', type: 'decimal', precision: 10, scale: 2 }, // Price at time of order
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'order_items',
      new TableForeignKey({
        columnNames: ['orderId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'orders',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'order_items',
      new TableForeignKey({
        columnNames: ['productId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'products',
        onDelete: 'RESTRICT', // Don't delete product if it's part of an order item
      })
    );

    // Create index on product name for faster search
    await queryRunner.createIndex(
      'products',
      new Table({
        name: 'IDX_PRODUCT_NAME',
        columnNames: ['name'],
        isUnique: false,
      })
    );

    // Create index on user email for faster lookup
    await queryRunner.createIndex(
      'users',
      new Table({
        name: 'IDX_USER_EMAIL',
        columnNames: ['email'],
        isUnique: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first in reverse order
    const tableProduct = await queryRunner.getTable('products');
    const tableReview = await queryRunner.getTable('reviews');
    const tableCart = await queryRunner.getTable('carts');
    const tableCartItem = await queryRunner.getTable('cart_items');
    const tableOrder = await queryRunner.getTable('orders');
    const tableOrderItem = await queryRunner.getTable('order_items');

    if (tableOrderItem) {
      await queryRunner.dropForeignKey('order_items', tableOrderItem.foreignKeys.find(fk => fk.columnNames.indexOf('productId') !== -1)!);
      await queryRunner.dropForeignKey('order_items', tableOrderItem.foreignKeys.find(fk => fk.columnNames.indexOf('orderId') !== -1)!);
    }
    if (tableOrder) {
      await queryRunner.dropForeignKey('orders', tableOrder.foreignKeys.find(fk => fk.columnNames.indexOf('userId') !== -1)!);
    }
    if (tableCartItem) {
      await queryRunner.dropForeignKey('cart_items', tableCartItem.foreignKeys.find(fk => fk.columnNames.indexOf('productId') !== -1)!);
      await queryRunner.dropForeignKey('cart_items', tableCartItem.foreignKeys.find(fk => fk.columnNames.indexOf('cartId') !== -1)!);
    }
    if (tableCart) {
      await queryRunner.dropForeignKey('carts', tableCart.foreignKeys.find(fk => fk.columnNames.indexOf('userId') !== -1)!);
    }
    if (tableReview) {
      await queryRunner.dropForeignKey('reviews', tableReview.foreignKeys.find(fk => fk.columnNames.indexOf('productId') !== -1)!);
      await queryRunner.dropForeignKey('reviews', tableReview.foreignKeys.find(fk => fk.columnNames.indexOf('userId') !== -1)!);
    }
    if (tableProduct) {
      await queryRunner.dropForeignKey('products', tableProduct.foreignKeys.find(fk => fk.columnNames.indexOf('sellerId') !== -1)!);
      await queryRunner.dropForeignKey('products', tableProduct.foreignKeys.find(fk => fk.columnNames.indexOf('categoryId') !== -1)!);
    }

    // Drop tables in reverse order of creation (or dependent tables first)
    await queryRunner.dropTable('order_items');
    await queryRunner.dropTable('orders');
    await queryRunner.dropTable('cart_items');
    await queryRunner.dropTable('carts');
    await queryRunner.dropTable('reviews');
    await queryRunner.dropTable('products');
    await queryRunner.dropTable('categories');
    await queryRunner.dropTable('users');
  }
}
```