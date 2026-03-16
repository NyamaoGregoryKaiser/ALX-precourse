import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { User, UserRole } from '../entities/User';
import { DataSource, DataSourceType } from '../entities/DataSource';
import { Dashboard } from '../entities/Dashboard';
import { Visualization, VisualizationType } from '../entities/Visualization';
import bcrypt from 'bcryptjs';
import { logger } from '../../utils/logger';

const seedDatabase = async () => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info('Database initialized for seeding.');
    }

    const userRepository = AppDataSource.getRepository(User);
    const dataSourceRepository = AppDataSource.getRepository(DataSource);
    const dashboardRepository = AppDataSource.getRepository(Dashboard);
    const visualizationRepository = AppDataSource.getRepository(Visualization);

    // Clear existing data (optional, for fresh seed)
    await visualizationRepository.delete({});
    await dashboardRepository.delete({});
    await dataSourceRepository.delete({});
    await userRepository.delete({});
    logger.info('Existing data cleared.');

    // 1. Create Users
    const hashedPassword1 = await bcrypt.hash('password123', 10);
    const hashedPassword2 = await bcrypt.hash('securepass', 10);

    const user1 = userRepository.create({
      username: 'testuser',
      email: 'user@example.com',
      password: hashedPassword1,
      role: UserRole.USER,
    });
    await userRepository.save(user1);

    const adminUser = userRepository.create({
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword2,
      role: UserRole.ADMIN,
    });
    await userRepository.save(adminUser);
    logger.info('Users created.');

    // 2. Create Data Sources
    const mockCsvDataSource = dataSourceRepository.create({
      name: 'Sales Data CSV',
      type: DataSourceType.CSV_MOCK,
      config: { filePath: process.env.MOCK_CSV_DATA_PATH || './src/db/mock_data/sample_data.csv' },
      owner: user1,
    });
    await dataSourceRepository.save(mockCsvDataSource);

    const anotherCsvDataSource = dataSourceRepository.create({
      name: 'Marketing Data',
      type: DataSourceType.CSV_MOCK,
      config: { filePath: './src/db/mock_data/marketing_data.csv' },
      owner: user1,
    });
    await dataSourceRepository.save(anotherCsvDataSource);
    logger.info('Data Sources created.');

    // 3. Create Dashboards
    const salesDashboard = dashboardRepository.create({
      name: 'Sales Performance',
      description: 'Overview of sales metrics',
      owner: user1,
      layout: {}, // Can be updated later via frontend
    });
    await dashboardRepository.save(salesDashboard);

    const marketingDashboard = dashboardRepository.create({
      name: 'Marketing Campaigns',
      description: 'Tracking marketing efforts',
      owner: user1,
      layout: {},
    });
    await dashboardRepository.save(marketingDashboard);
    logger.info('Dashboards created.');

    // 4. Create Visualizations
    const salesByRegionBarChart = visualizationRepository.create({
      title: 'Sales by Region',
      type: VisualizationType.BAR_CHART,
      description: 'Total sales grouped by region.',
      dataSource: mockCsvDataSource,
      dashboard: salesDashboard,
      query: {
        aggregate: 'sum',
        valueColumn: 'sales',
        groupByColumn: 'region',
      },
      config: {
        xAxisLabel: 'Region',
        yAxisLabel: 'Total Sales',
        backgroundColor: '#42A5F5',
      },
    });
    await visualizationRepository.save(salesByRegionBarChart);

    const monthlySalesLineChart = visualizationRepository.create({
      title: 'Monthly Sales Trend',
      type: VisualizationType.LINE_CHART,
      description: 'Sales over time.',
      dataSource: mockCsvDataSource,
      dashboard: salesDashboard,
      query: {
        aggregate: 'sum',
        valueColumn: 'sales',
        groupByColumn: 'month', // Assuming a 'month' column exists
        orderBy: 'month'
      },
      config: {
        xAxisLabel: 'Month',
        yAxisLabel: 'Sales Amount',
        lineColor: '#FFA726',
      },
    });
    await visualizationRepository.save(monthlySalesLineChart);

    const productCategoryPieChart = visualizationRepository.create({
      title: 'Sales by Product Category',
      type: VisualizationType.PIE_CHART,
      description: 'Distribution of sales across product categories.',
      dataSource: mockCsvDataSource,
      dashboard: salesDashboard,
      query: {
        aggregate: 'sum',
        valueColumn: 'sales',
        groupByColumn: 'product_category',
      },
      config: {
        colors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
      },
    });
    await visualizationRepository.save(productCategoryPieChart);

    logger.info('Visualizations created.');

    logger.info('Seeding complete!');
  } catch (error) {
    logger.error('Seeding failed:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('Database connection closed.');
    }
  }
};

seedDatabase();