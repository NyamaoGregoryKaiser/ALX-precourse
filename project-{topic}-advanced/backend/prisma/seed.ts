```typescript
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Create an Admin User
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@alx.com' },
    update: {},
    create: {
      email: 'admin@alx.com',
      password: adminPassword,
      name: 'Admin User',
      role: Role.ADMIN,
      address: '123 Admin Street, Admin City',
      phone: '+1234567890',
    },
  });
  console.log(`Created admin user with ID: ${admin.id}`);

  // Create a Regular User
  const userPassword = await bcrypt.hash('user123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'user@alx.com' },
    update: {},
    create: {
      email: 'user@alx.com',
      password: userPassword,
      name: 'Test User',
      role: Role.USER,
      address: '456 User Avenue, User Town',
      phone: '+0987654321',
    },
  });
  console.log(`Created regular user with ID: ${user.id}`);

  // Create Categories
  const electronics = await prisma.category.upsert({
    where: { name: 'Electronics' },
    update: {},
    create: { name: 'Electronics' },
  });
  const books = await prisma.category.upsert({
    where: { name: 'Books' },
    update: {},
    create: { name: 'Books' },
  });
  const clothing = await prisma.category.upsert({
    where: { name: 'Clothing' },
    update: {},
    create: { name: 'Clothing' },
  });
  console.log(`Created categories: ${electronics.name}, ${books.name}, ${clothing.name}`);

  // Create Products
  const productsData = [
    {
      name: 'Smartwatch X1',
      description: 'A cutting-edge smartwatch with health tracking and smart notifications.',
      price: 299.99,
      stock: 50,
      imageUrl: 'https://via.placeholder.com/400x300/F0F4F8/334155?text=Smartwatch',
      categoryId: electronics.id,
    },
    {
      name: 'Wireless Headphones Pro',
      description: 'Immersive sound and active noise cancellation for an unparalleled audio experience.',
      price: 199.50,
      stock: 75,
      imageUrl: 'https://via.placeholder.com/400x300/F0F4F8/334155?text=Headphones',
      categoryId: electronics.id,
    },
    {
      name: 'The Great Adventure',
      description: 'An epic fantasy novel that transports you to a world of magic and wonder.',
      price: 25.00,
      stock: 120,
      imageUrl: 'https://via.placeholder.com/400x300/F0F4F8/334155?text=Fantasy+Book',
      categoryId: books.id,
    },
    {
      name: 'Coding for Dummies',
      description: 'A beginner-friendly guide to programming concepts and languages.',
      price: 35.75,
      stock: 80,
      imageUrl: 'https://via.placeholder.com/400x300/F0F4F8/334155?text=Coding+Book',
      categoryId: books.id,
    },
    {
      name: 'Organic Cotton T-Shirt',
      description: 'Soft and comfortable t-shirt made from 100% organic cotton.',
      price: 19.99,
      stock: 200,
      imageUrl: 'https://via.placeholder.com/400x300/F0F4F8/334155?text=T-Shirt',
      categoryId: clothing.id,
    },
    {
      name: 'Running Shoes Boost',
      description: 'High-performance running shoes designed for ultimate comfort and speed.',
      price: 120.00,
      stock: 30,
      imageUrl: 'https://via.placeholder.com/400x300/F0F4F8/334155?text=Running+Shoes',
      categoryId: clothing.id,
    },
    {
      name: 'Laptop Pro 15',
      description: 'Powerful laptop for professionals, with a stunning display and long battery life.',
      price: 1499.00,
      stock: 15,
      imageUrl: 'https://via.placeholder.com/400x300/F0F4F8/334155?text=Laptop',
      categoryId: electronics.id,
    },
    {
      name: 'E-reader Light',
      description: 'Lightweight e-reader with glare-free screen for comfortable reading.',
      price: 99.00,
      stock: 60,
      imageUrl: 'https://via.placeholder.com/400x300/F0F4F8/334155?text=E-reader',
      categoryId: electronics.id,
    },
    {
      name: 'Coffee Maker Deluxe',
      description: 'Brew your perfect cup of coffee every morning with this advanced coffee maker.',
      price: 89.99,
      stock: 40,
      imageUrl: 'https://via.placeholder.com/400x300/F0F4F8/334155?text=Coffee+Maker',
      categoryId: electronics.id,
    },
    {
      name: 'Smartphone Alpha',
      description: 'The latest smartphone with an incredible camera and blazing-fast performance.',
      price: 799.00,
      stock: 25,
      imageUrl: 'https://via.placeholder.com/400x300/F0F4F8/334155?text=Smartphone',
      categoryId: electronics.id,
    },
    {
      name: 'Classic Denim Jacket',
      description: 'A timeless denim jacket that completes any casual outfit.',
      price: 75.00,
      stock: 90,
      imageUrl: 'https://via.placeholder.com/400x300/F0F4F8/334155?text=Denim+Jacket',
      categoryId: clothing.id,
    },
    {
      name: 'Yoga Mat Eco',
      description: 'Environmentally friendly yoga mat for comfortable and stable practice.',
      price: 45.00,
      stock: 110,
      imageUrl: 'https://via.placeholder.com/400x300/F0F4F8/334155?text=Yoga+Mat',
      categoryId: clothing.id,
    },
  ];

  for (const product of productsData) {
    await prisma.product.upsert({
      where: { name: product.name },
      update: {},
      create: product,
    });
  }
  console.log(`Created ${productsData.length} products.`);

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Seeding finished.');
  });
```

### Database Layer: Migration Scripts (Conceptual/Commands)

Prisma manages migrations automatically.

1.  **Initialize Prisma (if first time):**
    ```bash
    npx prisma init
    # This creates prisma/schema.prisma and a .env file
    ```
2.  **Define Schema:** Edit `backend/prisma/schema.prisma` as shown above.
3.  **Generate Migration:**
    ```bash
    npx prisma migrate dev --name init # 'init' is a descriptive name for your first migration
    ```
    This command will:
    *   Create a new migration file in `prisma/migrations` based on the current `schema.prisma`.
    *   Apply the migration to the database (creating tables, etc.).
    *   Generate `node_modules/@prisma/client` with types for your models.
4.  **Apply Seed Data:**
    ```bash
    npx prisma db seed # This runs the script defined in package.json for seeding
    ```

### Database Layer: Query Optimization (Principles)

*   **Indexing:** Already applied in `schema.prisma` (`@@index` for `categoryId`, `name`, `price` on `Product`, `userId` on `Order`, `cartId`, `productId` on `CartItem` and `OrderItem`). These are crucial for `WHERE` clauses, `ORDER BY` clauses, and `JOIN` operations.
*   **Selective Fields (`select`):** When fetching data, only request the fields you need. Prisma allows this explicitly (e.g., `select: { id: true, name: true }`). This reduces data transfer and database load.
*   **Eager vs. Lazy Loading (`include`):** Use `include` to fetch related data in a single query (eager loading) when you know you'll need it. Avoid N+1 queries by carefully planning your includes. For instance, `product.findMany({ include: { category: true } })` is more efficient than fetching products then looping to fetch each category separately.
*   **Pagination:** Implemented in `getAllProducts` and `getAllUsers` services using `skip` and `take` (offset-based pagination). For very large datasets, cursor-based pagination (using `cursor` and `take` with `orderBy` in Prisma) is often more performant as it avoids the performance penalty of `offset` on large tables.
*   **Filtering:** Use `where` clauses effectively to filter data at the database level.
*   **Caching:** Implemented a Redis caching layer for frequently accessed read-heavy endpoints like product listings and individual product details. This significantly reduces database load for common requests.
*   **Database Connection Pooling:** Prisma's client automatically handles connection pooling, which is essential for managing database connections efficiently in a high-concurrency environment.

---

## 6. Configuration & Setup

### Docker Setup