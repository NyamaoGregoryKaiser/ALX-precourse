```typescript
import { DataSource } from 'typeorm';
import { config } from './src/config';
import { User } from './src/modules/users/user.entity';
import { Product } from './src/modules/products/product.entity';
import { Category } from './src/modules/categories/category.entity';
import { Cart } from './src/modules/carts/cart.entity';
import { CartItem } from './src/modules/carts/cart-item.entity';
import { Order } from './src/modules/orders/order.entity';
import { OrderItem } from './src/modules/orders/order-item.entity';
import { Review } from './src/modules/reviews/review.entity';

// This file is used by the TypeORM CLI to run migrations, seeds, etc.
// It uses `module.exports` for commonjs compatibility with `typeorm-ts-node-commonjs`.
module.exports = new DataSource({
  type: 'postgres',
  host: config.DATABASE.HOST,
  port: config.DATABASE.PORT,
  username: config.DATABASE.USERNAME,
  password: config.DATABASE.PASSWORD,
  database: config.DATABASE.NAME,
  synchronize: false,
  logging: ['error'], // Only log errors for CLI
  entities: [
    User,
    Product,
    Category,
    Cart,
    CartItem,
    Order,
    OrderItem,
    Review,
  ],
  migrations: [
    './src/database/migrations/**/*.ts'
  ],
  seeds: [ // For seed scripts if using a seed library or custom script
    './src/database/seeds/**/*.ts'
  ]
});
```