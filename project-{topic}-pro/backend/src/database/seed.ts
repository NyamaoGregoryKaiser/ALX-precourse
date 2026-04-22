```typescript
import { AppDataSource } from './data-source';
import { User } from './entities/User';
import { Dashboard } from './entities/Dashboard';
import { DataSource as DataSrcEntity, DataSourceType } from './entities/DataSource';
import { Chart, ChartType } from './entities/Chart';
import * as bcrypt from 'bcryptjs';

async function seedDatabase() {
    await AppDataSource.initialize();
    console.log("Database connection established for seeding.");

    const userRepository = AppDataSource.getRepository(User);
    const dataSourceRepository = AppDataSource.getRepository(DataSrcEntity);
    const dashboardRepository = AppDataSource.getRepository(Dashboard);
    const chartRepository = AppDataSource.getRepository(Chart);

    // Clear existing data (optional, for development only)
    await chartRepository.delete({});
    await dashboardRepository.delete({});
    await dataSourceRepository.delete({});
    await userRepository.delete({});
    console.log("Cleared existing data.");

    // 1. Create a User
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = userRepository.create({
        email: 'test@example.com',
        password: hashedPassword,
        role: 'admin'
    });
    await userRepository.save(user);
    console.log(`User created: ${user.email}`);

    // 2. Create a Data Source for the User
    const dataSource = dataSourceRepository.create({
        name: 'My Analytics DB',
        type: DataSourceType.POSTGRES,
        connectionDetails: {
            host: 'localhost',
            port: 5432,
            username: 'myuser',
            password: 'mypassword',
            database: 'analytics_db'
        },
        userId: user.id
    });
    await dataSourceRepository.save(dataSource);
    console.log(`Data Source created: ${dataSource.name}`);

    // 3. Create a Dashboard for the User
    const dashboard = dashboardRepository.create({
        name: 'Sales Overview',
        description: 'Key sales metrics for Q1',
        userId: user.id
    });
    await dashboardRepository.save(dashboard);
    console.log(`Dashboard created: ${dashboard.name}`);

    // 4. Create Charts for the Dashboard
    const chart1 = chartRepository.create({
        name: 'Monthly Sales',
        type: ChartType.BAR,
        configuration: {
            xAxis: { dataKey: 'month' },
            yAxis: { label: 'Sales ($)' },
            bars: [{ dataKey: 'sales', fill: '#8884d8' }],
            title: 'Monthly Sales Performance'
        },
        query: 'SELECT month, SUM(revenue) AS sales FROM sales_data GROUP BY month ORDER BY month;',
        dashboardId: dashboard.id,
        dataSourceId: dataSource.id
    });
    await chartRepository.save(chart1);
    console.log(`Chart 1 created: ${chart1.name}`);

    const chart2 = chartRepository.create({
        name: 'Customers by Region',
        type: ChartType.PIE,
        configuration: {
            dataKey: 'value',
            nameKey: 'name',
            slices: [{ name: 'North', value: 400 }, { name: 'South', value: 300 }, { name: 'East', value: 300 }, { name: 'West', value: 200 }],
            title: 'Customer Distribution by Region'
        },
        query: 'SELECT region AS name, COUNT(id) AS value FROM customers GROUP BY region;',
        dashboardId: dashboard.id,
        dataSourceId: dataSource.id
    });
    await chartRepository.save(chart2);
    console.log(`Chart 2 created: ${chart2.name}`);

    console.log("Seeding complete!");
    await AppDataSource.destroy();
}

seedDatabase().catch(error => console.error("Database seeding failed:", error));
```