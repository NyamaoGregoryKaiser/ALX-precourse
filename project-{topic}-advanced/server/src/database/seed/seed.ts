// This would be a Node.js script run separately, not part of TypeORM migrations directly.
// Example: ts-node server/src/database/seed/seed.ts

import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { User } from '../entities/User.entity';
import { DataSource as DataVizDataSource } from '../entities/DataSource.entity';
import { Chart } from '../entities/Chart.entity';
import { Dashboard } from '../entities/Dashboard.entity';
import { UserRole } from '../../types/user.types';
import { DataSourceType } from '../../types/dataSource.types';
import { ChartType } from '../../types/chart.types';
import { encrypt } from '../../utils/encryption.util';
import bcrypt from 'bcryptjs';
import { logger } from '../../middleware/logger.middleware';

// Ensure dotenv is loaded for ENCRYPTION_KEY
require('dotenv').config({ path: '.env' });

async function seed() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  try {
    logger.info('Starting database seeding...');

    // Clear existing data (optional, use with caution in production)
    await AppDataSource.getRepository(Dashboard).delete({});
    await AppDataSource.getRepository(Chart).delete({});
    await AppDataSource.getRepository(DataVizDataSource).delete({});
    await AppDataSource.getRepository(User).delete({});
    logger.info('Cleared existing data.');

    // 1. Create Users
    const hashedPassword = await bcrypt.hash('adminpassword', 10);
    const adminUser = AppDataSource.getRepository(User).create({
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
    });
    await AppDataSource.getRepository(User).save(adminUser);
    logger.info(`Created user: ${adminUser.email}`);

    const hashedPassword2 = await bcrypt.hash('userpassword', 10);
    const regularUser = AppDataSource.getRepository(User).create({
      username: 'testuser',
      email: 'user@example.com',
      password: hashedPassword2,
      role: UserRole.EDITOR,
    });
    await AppDataSource.getRepository(User).save(regularUser);
    logger.info(`Created user: ${regularUser.email}`);

    // 2. Create Data Sources
    const postgresDetails = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'dataviz_db',
      sslMode: 'disable', // Or 'require' for production
    };
    const encryptedPostgresDetails = encrypt(JSON.stringify(postgresDetails));

    const pgDataSource = AppDataSource.getRepository(DataVizDataSource).create({
      name: 'My PostgreSQL DB',
      type: DataSourceType.POSTGRESQL,
      connectionDetails: encryptedPostgresDetails,
      user: adminUser,
    });
    await AppDataSource.getRepository(DataVizDataSource).save(pgDataSource);
    logger.info(`Created data source: ${pgDataSource.name}`);

    // 3. Create Charts
    const barChartConfig = JSON.stringify({
      title: { text: 'Monthly Sales' },
      tooltip: {},
      legend: { data: ['Sales'] },
      // xAxis, yAxis, series will be dynamically populated by ChartRenderer
    });

    const barChart = AppDataSource.getRepository(Chart).create({
      name: 'Monthly Sales Bar Chart',
      description: 'Bar chart showing sales data.',
      type: ChartType.BAR,
      dataSource: pgDataSource,
      query: 'SELECT month, sales FROM sales_data ORDER BY month', // Example query
      configuration: barChartConfig,
      user: adminUser,
    });
    await AppDataSource.getRepository(Chart).save(barChart);
    logger.info(`Created chart: ${barChart.name}`);

    const pieChartConfig = JSON.stringify({
        title: { text: 'Product Categories Share' },
        tooltip: { trigger: 'item' },
        legend: { orient: 'vertical', left: 'left' },
        // series data will be dynamically populated
    });

    const pieChart = AppDataSource.getRepository(Chart).create({
        name: 'Product Categories Pie Chart',
        description: 'Pie chart showing revenue distribution by product category.',
        type: ChartType.PIE,
        dataSource: pgDataSource,
        query: 'SELECT category, SUM(revenue) as total_revenue FROM product_sales GROUP BY category',
        configuration: pieChartConfig,
        user: adminUser,
    });
    await AppDataSource.getRepository(Chart).save(pieChart);
    logger.info(`Created chart: ${pieChart.name}`);

    // 4. Create Dashboards
    const dashboardLayout = [
      { i: barChart.id, x: 0, y: 0, w: 6, h: 8 },
      { i: pieChart.id, x: 6, y: 0, w: 6, h: 8 },
    ];

    const mainDashboard = AppDataSource.getRepository(Dashboard).create({
      name: 'Sales Overview',
      description: 'Key performance indicators for sales.',
      layout: dashboardLayout,
      user: adminUser,
      charts: [barChart, pieChart],
    });
    await AppDataSource.getRepository(Dashboard).save(mainDashboard);
    logger.info(`Created dashboard: ${mainDashboard.name}`);

    logger.info('Database seeding completed successfully!');
  } catch (error) {
    logger.error('Database seeding failed:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

seed();