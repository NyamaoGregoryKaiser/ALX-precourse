```typescript
import 'reflect-metadata';
import { AppDataSource } from '../../config/database';
import { User, UserRole } from '../../entities/User';
import { Database, DatabaseType } from '../../entities/Database';
import { SlowQuery } from '../../entities/SlowQuery';
import { QuerySuggestion, SuggestionType, SuggestionStatus } from '../../entities/QuerySuggestion';
import { QueryPlan, QueryPlanFormat } from '../../entities/QueryPlan';
import config from '../../config';
import logger from '../../services/logger.service';

const seed = async () => {
  logger.info('Starting database seeding...');
  await AppDataSource.initialize();

  try {
    // Clear existing data (optional, for development/testing)
    logger.info('Clearing existing data...');
    await AppDataSource.manager.query('TRUNCATE TABLE query_suggestions RESTART IDENTITY CASCADE;');
    await AppDataSource.manager.query('TRUNCATE TABLE query_plans RESTART IDENTITY CASCADE;');
    await AppDataSource.manager.query('TRUNCATE TABLE slow_queries RESTART IDENTITY CASCADE;');
    await AppDataSource.manager.query('TRUNCATE TABLE databases RESTART IDENTITY CASCADE;');
    await AppDataSource.manager.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE;');

    // Create Admin User
    const adminUser = new User();
    adminUser.email = 'admin@example.com';
    adminUser.password = await adminUser.hashPassword('adminpassword');
    adminUser.role = UserRole.ADMIN;
    await AppDataSource.manager.save(adminUser);
    logger.info(`Created admin user: ${adminUser.email}`);

    // Create Regular User
    const regularUser = new User();
    regularUser.email = 'user@example.com';
    regularUser.password = await regularUser.hashPassword('userpassword');
    regularUser.role = UserRole.USER;
    await AppDataSource.manager.save(regularUser);
    logger.info(`Created regular user: ${regularUser.email}`);

    // Create Databases
    const db1 = new Database();
    db1.name = 'Order_Management_DB';
    db1.type = DatabaseType.POSTGRES;
    db1.connectionString = `postgresql://${config.database.username}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.database}`;
    db1.description = 'Database for processing customer orders.';
    db1.owner = adminUser;
    db1.ownerId = adminUser.id;
    await AppDataSource.manager.save(db1);
    logger.info(`Created database: ${db1.name}`);

    const db2 = new Database();
    db2.name = 'Product_Catalog_DB';
    db2.type = DatabaseType.MYSQL;
    db2.connectionString = `mysql://user:pass@host:3306/catalog_db`; // Example for MySQL
    db2.description = 'Stores product information and inventory levels.';
    db2.owner = regularUser;
    db2.ownerId = regularUser.id;
    await AppDataSource.manager.save(db2);
    logger.info(`Created database: ${db2.name}`);

    // Create Slow Queries
    const slowQuery1 = new SlowQuery();
    slowQuery1.query = `
      SELECT o.order_id, c.customer_name, p.product_name, oi.quantity, oi.price
      FROM orders o
      JOIN customers c ON o.customer_id = c.customer_id
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN products p ON oi.product_id = p.product_id
      WHERE o.order_date < '2023-01-01' AND c.region = 'North'
      ORDER BY o.order_date DESC
      LIMIT 1000;
    `;
    slowQuery1.executionTimeMs = 12500; // 12.5 seconds
    slowQuery1.clientApplication = 'ERP_App';
    slowQuery1.clientHostname = 'erp-server-01';
    slowQuery1.database = db1;
    slowQuery1.databaseId = db1.id;
    slowQuery1.reporter = adminUser;
    slowQuery1.reporterId = adminUser.id;
    await AppDataSource.manager.save(slowQuery1);
    logger.info(`Created slow query: ${slowQuery1.id}`);

    const slowQuery2 = new SlowQuery();
    slowQuery2.query = `
      SELECT * FROM user_activity
      WHERE action_type = 'page_view'
      AND created_at BETWEEN '2024-03-01' AND '2024-03-31'
      ORDER BY created_at;
    `;
    slowQuery2.executionTimeMs = 8500; // 8.5 seconds
    slowQuery2.clientApplication = 'Analytics_Dashboard';
    slowQuery2.clientHostname = 'analytics-vm-02';
    slowQuery2.database = db1;
    slowQuery2.databaseId = db1.id;
    slowQuery2.reporter = regularUser;
    slowQuery2.reporterId = regularUser.id;
    await AppDataSource.manager.save(slowQuery2);
    logger.info(`Created slow query: ${slowQuery2.id}`);

    // Create Query Plan for slowQuery1 (Simulated)
    const plan1 = new QueryPlan();
    plan1.slowQuery = slowQuery1;
    plan1.slowQueryId = slowQuery1.id;
    plan1.planData = {
      "Plan": {
        "Node Type": "Hash Join",
        "Parallel Aware": false,
        "Join Type": "Inner",
        "Startup Cost": 1000.00,
        "Total Cost": 15000.00,
        "Plan Rows": 12000,
        "Plan Width": 250,
        "Actual Startup Time": 120.500,
        "Actual Total Time": 12450.000,
        "Actual Rows": 1000,
        "Actual Loops": 1,
        "Hash Cond": "(oi.product_id = p.product_id)",
        "Plans": [
          {
            "Node Type": "Hash Join",
            "Parent Relationship": "Outer",
            "Parallel Aware": false,
            "Join Type": "Inner",
            "Startup Cost": 500.00,
            "Total Cost": 7000.00,
            "Plan Rows": 15000,
            "Plan Width": 180,
            "Actual Startup Time": 50.000,
            "Actual Total Time": 6000.000,
            "Actual Rows": 2000,
            "Actual Loops": 1,
            "Hash Cond": "(o.customer_id = c.customer_id)",
            "Plans": [
              {
                "Node Type": "Seq Scan",
                "Parent Relationship": "Outer",
                "Parallel Aware": false,
                "Relation Name": "orders",
                "Alias": "o",
                "Startup Cost": 0.00,
                "Total Cost": 3000.00,
                "Plan Rows": 50000,
                "Plan Width": 80,
                "Actual Startup Time": 0.050,
                "Actual Total Time": 1500.000,
                "Actual Rows": 50000,
                "Actual Loops": 1,
                "Filter": "(o.order_date < '2023-01-01')",
                "Rows Removed by Filter": 150000
              },
              {
                "Node Type": "Hash",
                "Parent Relationship": "Inner",
                "Parallel Aware": false,
                "Startup Cost": 400.00,
                "Total Cost": 400.00,
                "Plan Rows": 10000,
                "Plan Width": 100,
                "Actual Startup Time": 40.000,
                "Actual Total Time": 40.000,
                "Actual Rows": 10000,
                "Actual Loops": 1,
                "Plans": [
                  {
                    "Node Type": "Seq Scan",
                    "Parent Relationship": "Outer",
                    "Parallel Aware": false,
                    "Relation Name": "customers",
                    "Alias": "c",
                    "Startup Cost": 0.00,
                    "Total Cost": 350.00,
                    "Plan Rows": 10000,
                    "Plan Width": 100,
                    "Actual Startup Time": 0.020,
                    "Actual Total Time": 30.000,
                    "Actual Rows": 10000,
                    "Actual Loops": 1,
                    "Filter": "(c.region = 'North')",
                    "Rows Removed by Filter": 90000
                  }
                ]
              }
            ]
          }
        ]
      }
    };
    plan1.totalCost = 15000.00;
    plan1.actualRows = 1000;
    await AppDataSource.manager.save(plan1);
    logger.info(`Created query plan for ${slowQuery1.id}`);

    // Create Query Suggestions for slowQuery1
    const suggestion1_1 = new QuerySuggestion();
    suggestion1_1.slowQuery = slowQuery1;
    suggestion1_1.slowQueryId = slowQuery1.id;
    suggestion1_1.type = SuggestionType.INDEX;
    suggestion1_1.description = 'Create an index on `orders.order_date` to speed up filtering.';
    suggestion1_1.sqlStatement = 'CREATE INDEX idx_orders_order_date ON orders (order_date);';
    await AppDataSource.manager.save(suggestion1_1);

    const suggestion1_2 = new QuerySuggestion();
    suggestion1_2.slowQuery = slowQuery1;
    suggestion1_2.slowQueryId = slowQuery1.id;
    suggestion1_2.type = SuggestionType.INDEX;
    suggestion1_2.description = 'Consider a composite index on `customers.region` and `customers.customer_id` for join efficiency.';
    suggestion1_2.sqlStatement = 'CREATE INDEX idx_customers_region_id ON customers (region, customer_id);';
    suggestion1_2.status = SuggestionStatus.APPLIED;
    suggestion1_2.appliedAt = new Date();
    await AppDataSource.manager.save(suggestion1_2);
    logger.info(`Created query suggestions for ${slowQuery1.id}`);

    // Create Query Suggestion for slowQuery2
    const suggestion2_1 = new QuerySuggestion();
    suggestion2_1.slowQuery = slowQuery2;
    suggestion2_1.slowQueryId = slowQuery2.id;
    suggestion2_1.type = SuggestionType.INDEX;
    suggestion2_1.description = 'Create a composite index on `user_activity (action_type, created_at)` for optimal filtering and sorting.';
    suggestion2_1.sqlStatement = 'CREATE INDEX idx_user_activity_type_created ON user_activity (action_type, created_at);';
    await AppDataSource.manager.save(suggestion2_1);
    logger.info(`Created query suggestion for ${slowQuery2.id}`);

  } catch (error) {
    logger.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
    logger.info('Database seeding complete.');
  }
};

seed();
```

#### `backend/src/middleware/auth.middleware.ts`