```typescript
import { AppDataSourceInstance } from '..';
import { User, UserRole } from '../entities/User';
import { DataSource, DataSourceType } from '../entities/DataSource';
import { Dataset } from '../entities/Dataset';
import { Dashboard } from '../entities/Dashboard';
import { Visualization, ChartType } from '../entities/Visualization';
import bcrypt from 'bcryptjs';
import logger from '../../config/logger';

const seed = async () => {
  logger.info('Starting database seeding...');
  try {
    await AppDataSourceInstance.initialize();
    logger.info('Database connection for seeding initialized.');

    const userRepository = AppDataSourceInstance.getRepository(User);
    const dataSourceRepository = AppDataSourceInstance.getRepository(DataSource);
    const datasetRepository = AppDataSourceInstance.getRepository(Dataset);
    const dashboardRepository = AppDataSourceInstance.getRepository(Dashboard);
    const visualizationRepository = AppDataSourceInstance.getRepository(Visualization);

    // Clear existing data (optional, useful for development)
    await visualizationRepository.delete({});
    await dashboardRepository.delete({});
    await datasetRepository.delete({});
    await dataSourceRepository.delete({});
    await userRepository.delete({});
    logger.info('Existing data cleared.');

    // 1. Create Users
    const hashedPassword = await bcrypt.hash('password123', 10);
    const adminUser = userRepository.create({
      email: 'admin@example.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
    });
    await userRepository.save(adminUser);

    const regularUser = userRepository.create({
      email: 'user@example.com',
      password: hashedPassword,
      role: UserRole.USER,
    });
    await userRepository.save(regularUser);
    logger.info('Users seeded.');

    // 2. Create Data Sources
    const pgDataSource = dataSourceRepository.create({
      name: 'Sales Database',
      type: DataSourceType.POSTGRES,
      connectionConfig: {
        host: 'db', // Docker service name
        port: 5432,
        username: 'postgres',
        password: 'password',
        database: 'datavizdb',
      },
      description: 'Main sales data from PostgreSQL.',
      user: adminUser,
    });
    await dataSourceRepository.save(pgDataSource);

    const csvDataSource = dataSourceRepository.create({
      name: 'Customer Data CSV',
      type: DataSourceType.CSV_UPLOAD,
      connectionConfig: {
        // In a real scenario, this would point to a file storage path or S3 URL
        filePath: 'mock_customer_data.csv',
        headers: ['id', 'name', 'age', 'city', 'country', 'revenue'],
      },
      description: 'Customer demographics and purchase data from a CSV upload.',
      user: regularUser,
    });
    await dataSourceRepository.save(csvDataSource);
    logger.info('Data Sources seeded.');

    // 3. Create Datasets
    const salesDataset = datasetRepository.create({
      name: 'Monthly Sales Report',
      query: 'SELECT month, category, SUM(revenue) as total_revenue, COUNT(order_id) as total_orders FROM sales_data GROUP BY month, category ORDER BY month, category;',
      schema: {
        month: { type: 'string' },
        category: { type: 'string' },
        total_revenue: { type: 'number' },
        total_orders: { type: 'number' },
      },
      description: 'Aggregated monthly sales by product category.',
      dataSource: pgDataSource,
    });
    await datasetRepository.save(salesDataset);

    const customerDataset = datasetRepository.create({
      name: 'Customers by City',
      query: 'SELECT city, COUNT(id) as total_customers, AVG(age) as avg_age, SUM(revenue) as total_revenue FROM customers GROUP BY city;', // For CSV, this would be processed differently
      schema: {
        city: { type: 'string' },
        total_customers: { type: 'number' },
        avg_age: { type: 'number' },
        total_revenue: { type: 'number' },
      },
      description: 'Customer count and average age per city from CSV data.',
      dataSource: csvDataSource,
    });
    await datasetRepository.save(customerDataset);
    logger.info('Datasets seeded.');

    // 4. Create Dashboards
    const salesDashboard = dashboardRepository.create({
      name: 'Executive Sales Overview',
      description: 'Key performance indicators for sales executives.',
      user: adminUser,
      layout: {
        // Example react-grid-layout structure
        lg: [
          { i: 'viz1', x: 0, y: 0, w: 6, h: 4 },
          { i: 'viz2', x: 6, y: 0, w: 6, h: 4 },
        ]
      },
    });
    await dashboardRepository.save(salesDashboard);

    const marketingDashboard = dashboardRepository.create({
      name: 'Customer Insights',
      description: 'Dashboard for marketing team to understand customer demographics.',
      user: regularUser,
      layout: {
        lg: [
          { i: 'viz3', x: 0, y: 0, w: 12, h: 5 },
        ]
      },
    });
    await dashboardRepository.save(marketingDashboard);
    logger.info('Dashboards seeded.');


    // 5. Create Visualizations
    const monthlySalesBarChart = visualizationRepository.create({
      name: 'Monthly Revenue by Category',
      chartType: ChartType.BAR,
      configuration: {
        xField: 'month',
        yField: 'total_revenue',
        seriesField: 'category',
        title: 'Monthly Revenue by Product Category',
        xAxisLabel: 'Month',
        yAxisLabel: 'Total Revenue',
      },
      dataMapping: {
        // This is simplified, actual mapping might be more complex for different chart libs
        category: 'category',
        value: 'total_revenue',
        axis: 'month'
      },
      description: 'Bar chart showing total revenue per month, broken down by product category.',
      dataset: salesDataset,
      dashboard: salesDashboard,
    });
    await visualizationRepository.save(monthlySalesBarChart);

    const totalOrdersLineChart = visualizationRepository.create({
      name: 'Total Orders Trend',
      chartType: ChartType.LINE,
      configuration: {
        xField: 'month',
        yField: 'total_orders',
        title: 'Monthly Order Count Trend',
        xAxisLabel: 'Month',
        yAxisLabel: 'Number of Orders',
      },
      dataMapping: {
        x: 'month',
        y: 'total_orders'
      },
      description: 'Line chart showing the trend of total orders over months.',
      dataset: salesDataset,
      dashboard: salesDashboard,
    });
    await visualizationRepository.save(totalOrdersLineChart);

    const customersByCityPieChart = visualizationRepository.create({
      name: 'Customers by City Distribution',
      chartType: ChartType.PIE,
      configuration: {
        angleField: 'total_customers',
        colorField: 'city',
        title: 'Customer Distribution by City',
      },
      dataMapping: {
        value: 'total_customers',
        category: 'city'
      },
      description: 'Pie chart illustrating the proportion of customers across different cities.',
      dataset: customerDataset,
      dashboard: marketingDashboard,
    });
    await visualizationRepository.save(customersByCityPieChart);
    logger.info('Visualizations seeded.');

    logger.info('Database seeding completed successfully!');

  } catch (error) {
    logger.error('Error during database seeding:', error);
    process.exit(1);
  } finally {
    if (AppDataSourceInstance.isInitialized) {
      await AppDataSourceInstance.destroy();
      logger.info('Database connection closed after seeding.');
    }
  }
};

seed();
```