```typescript
import 'reflect-metadata';
import { AppDataSource } from '../dataSource';
import { User, UserRole } from '../entities/User';
import { DataSource as AppDataSourceEntity } from '../entities/DataSource';
import { Dashboard } from '../entities/Dashboard';
import { Chart } from '../entities/Chart';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

// Example CSV data for simulation
const sampleCsvFilePath = './data_uploads/sample_data.csv';
const sampleCsvContent = `category,value,count,date
A,10,5,2023-01-01
B,20,8,2023-01-02
A,12,6,2023-01-03
C,15,3,2023-01-04
B,18,7,2023-01-05
C,10,2,2023-01-06
A,5,1,2023-01-07
`;

import fs from 'fs';
import path from 'path';

async function seedDatabase() {
  await AppDataSource.initialize();
  logger.info('Database initialized for seeding.');

  const userRepository = AppDataSource.getRepository(User);
  const dataSourceRepository = AppDataSource.getRepository(AppDataSourceEntity);
  const dashboardRepository = AppDataSource.getRepository(Dashboard);
  const chartRepository = AppDataSource.getRepository(Chart);

  // Clear existing data (optional, for fresh seed)
  logger.info('Clearing existing data...');
  await chartRepository.delete({});
  await dashboardRepository.delete({});
  await dataSourceRepository.delete({});
  await userRepository.delete({});
  logger.info('Existing data cleared.');

  // Create temporary directory for CSV uploads if it doesn't exist
  const uploadDir = path.dirname(sampleCsvFilePath);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  fs.writeFileSync(sampleCsvFilePath, sampleCsvContent);
  logger.info(`Sample CSV file created at: ${sampleCsvFilePath}`);


  // 1. Create Users
  const hashedPassword1 = await bcrypt.hash('password123', 10);
  const user1 = userRepository.create({
    username: 'testuser',
    email: 'test@example.com',
    password: hashedPassword1,
    role: UserRole.USER,
  });
  await userRepository.save(user1);
  logger.info(`User 'testuser' created.`);

  const hashedPassword2 = await bcrypt.hash('adminpassword', 10);
  const adminUser = userRepository.create({
    username: 'admin',
    email: 'admin@example.com',
    password: hashedPassword2,
    role: UserRole.ADMIN,
  });
  await userRepository.save(adminUser);
  logger.info(`Admin user 'admin' created.`);

  // 2. Create Data Sources
  const csvDataSource = dataSourceRepository.create({
    userId: user1.id,
    name: 'Sales Data CSV',
    description: 'Sample sales data from CSV upload.',
    type: 'csv',
    configuration: { filePath: sampleCsvFilePath, originalFileName: 'sample_data.csv' },
  });
  await dataSourceRepository.save(csvDataSource);
  logger.info(`Data Source 'Sales Data CSV' created.`);

  const mockDbDataSource = dataSourceRepository.create({
    userId: user1.id,
    name: 'Product Performance (Mock DB)',
    description: 'Mock data source representing a connection to an external database.',
    type: 'database',
    configuration: { connectionString: 'postgres://mock:mock@mockdb:5432/mock_sales' },
  });
  await dataSourceRepository.save(mockDbDataSource);
  logger.info(`Data Source 'Product Performance' created.`);

  // 3. Create Dashboards
  const salesDashboard = dashboardRepository.create({
    userId: user1.id,
    name: 'Sales Overview',
    description: 'A dashboard showing key sales metrics.',
  });
  await dashboardRepository.save(salesDashboard);
  logger.info(`Dashboard 'Sales Overview' created.`);

  const marketingDashboard = dashboardRepository.create({
    userId: user1.id,
    name: 'Marketing Campaign Performance',
    description: 'Tracks performance of various marketing campaigns.',
  });
  await dashboardRepository.save(marketingDashboard);
  logger.info(`Dashboard 'Marketing Campaign Performance' created.`);

  // 4. Create Charts
  const barChart = chartRepository.create({
    userId: user1.id,
    dashboardId: salesDashboard.id,
    dataSourceId: csvDataSource.id,
    name: 'Sales by Category (Bar)',
    description: 'Bar chart showing total sales value per category.',
    type: 'bar',
    configuration: {
      xAxis: 'category',
      yAxis: 'value',
      // Add more Nivo specific configuration here
      // For example: layout: 'vertical', enableLabel: false
    },
  });
  await chartRepository.save(barChart);
  logger.info(`Chart 'Sales by Category (Bar)' created.`);

  const pieChart = chartRepository.create({
    userId: user1.id,
    dashboardId: salesDashboard.id,
    dataSourceId: csvDataSource.id,
    name: 'Sales Distribution (Pie)',
    description: 'Pie chart showing the distribution of sales value across categories.',
    type: 'pie',
    configuration: {
      category: 'category', // Field for slices
      value: 'value',     // Field for slice size
    },
  });
  await chartRepository.save(pieChart);
  logger.info(`Chart 'Sales Distribution (Pie)' created.`);

  const lineChart = chartRepository.create({
    userId: user1.id,
    dashboardId: salesDashboard.id,
    dataSourceId: csvDataSource.id,
    name: 'Daily Sales Trend (Line)',
    description: 'Line chart showing daily sales trend.',
    type: 'line',
    configuration: {
      xAxis: 'date',
      yAxis: 'value',
      xFormat: 'time:%Y-%m-%d',
      yFormat: '$.2f',
      curve: 'monotoneX',
    },
  });
  await chartRepository.save(lineChart);
  logger.info(`Chart 'Daily Sales Trend (Line)' created.`);

  logger.info('Database seeding complete!');
  await AppDataSource.destroy();
}

seedDatabase().catch((error) => {
  logger.error('Error seeding database:', error);
  process.exit(1);
});
```