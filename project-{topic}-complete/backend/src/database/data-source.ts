```typescript
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from '../config';
import { User } from '../modules/users/user.entity';
import { Product } from '../modules/products/product.entity';
import { Category } from '../modules/categories/category.entity';
import { Cart } from '../modules/carts/cart.entity';
import { CartItem } from '../modules/carts/cart-item.entity';
import { Order } from '../modules/orders/order.entity';
import { OrderItem } from '../modules/orders/order-item.entity';
import { Review } from '../modules/reviews/review.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.DATABASE.HOST,
  port: config.DATABASE.PORT,
  username: config.DATABASE.USERNAME,
  password: config.DATABASE.PASSWORD,
  database: config.DATABASE.NAME,
  synchronize: false, // Set to false in production to use migrations
  logging: config.NODE_ENV === 'development' ? ['query', 'error'] : false,
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
    __dirname + '/migrations/**/*.ts' // Path to your migration files
  ],
  subscribers: [],
});
```