```typescript
import { AppDataSource } from '../dataSource';
import { Chart } from '../entities/Chart';
import { AppError } from '../utils/appError';
import { cacheService } from './cache.service';
import { getProcessedDataSourceData } from './dataSource.service';
import { logger } from '../utils/logger';
import { Dashboard } from '../entities/Dashboard';
import { DataSource } from '../entities/DataSource';

const chartRepository = AppDataSource.getRepository(Chart);
const dashboardRepository = AppDataSource.getRepository(Dashboard);
const dataSourceRepository = AppDataSource.getRepository(DataSource);

export const createChart = async (userId: string, data: Partial<Chart>): Promise<Chart> => {
  // Ensure dashboard and data source exist and belong to the user
  const dashboard = await dashboardRepository.findOne({ where: { id: data.dashboardId, userId } });
  if (!dashboard) {
    throw new AppError('Dashboard not found or you do not have access.', 404);
  }
  const dataSource = await dataSourceRepository.findOne({ where: { id: data.dataSourceId, userId } });
  if (!dataSource) {
    throw new AppError('Data source not found or you do not have access.', 404);
  }

  const newChart = chartRepository.create({ ...data, userId, dashboard, dataSource });
  try {
    const savedChart = await chartRepository.save(newChart);
    // Invalidate relevant caches
    await cacheService.del(`user:${userId}:charts`);
    await cacheService.del(`dashboard:${data.dashboardId}:full`);
    return savedChart;
  } catch (error: any) {
    logger.error(`Failed to create chart: ${error.message}`, { userId, data, error });
    throw new AppError('Failed to create chart', 500);
  }
};

export const getAllCharts = async (userId: string): Promise<Chart[]> => {
  const cacheKey = `user:${userId}:charts`;
  const cachedData = await cacheService.get<Chart[]>(cacheKey);
  if (cachedData) {
    logger.info(`Serving charts for user ${userId} from cache.`);
    return cachedData;
  }

  try {
    const charts = await chartRepository.find({
      where: { userId },
      relations: ['dashboard', 'dataSource'], // Eager load relations
    });
    await cacheService.set(cacheKey, charts, 60 * 5); // Cache for 5 minutes
    return charts;
  } catch (error: any) {
    logger.error(`Failed to get all charts: ${error.message}`, { userId, error });
    throw new AppError('Failed to retrieve charts', 500);
  }
};

export const getChartById = async (userId: string, id: string): Promise<Chart> => {
  const cacheKey = `chart:${id}:full`;
  const cachedData = await cacheService.get<Chart>(cacheKey);
  if (cachedData) {
    logger.info(`Serving chart ${id} from cache.`);
    return cachedData;
  }

  const chart = await chartRepository.findOne({
    where: { id, userId },
    relations: ['dashboard', 'dataSource'],
  });

  if (!chart) {
    throw new AppError('Chart not found or you do not have access', 404);
  }
  await cacheService.set(cacheKey, chart, 60 * 10); // Cache for 10 minutes
  return chart;
};

export const updateChart = async (userId: string, id: string, data: Partial<Chart>): Promise<Chart> => {
  const chart = await getChartById(userId, id); // Includes ownership check
  chartRepository.merge(chart, data);

  // If dashboard or data source is updated, ensure ownership
  if (data.dashboardId && data.dashboardId !== chart.dashboard.id) {
    const newDashboard = await dashboardRepository.findOne({ where: { id: data.dashboardId, userId } });
    if (!newDashboard) throw new AppError('New dashboard not found or you do not have access.', 404);
    chart.dashboard = newDashboard;
  }
  if (data.dataSourceId && data.dataSourceId !== chart.dataSource.id) {
    const newDataSource = await dataSourceRepository.findOne({ where: { id: data.dataSourceId, userId } });
    if (!newDataSource) throw new AppError('New data source not found or you do not have access.', 404);
    chart.dataSource = newDataSource;
  }

  try {
    const updatedChart = await chartRepository.save(chart);
    await cacheService.del(`user:${userId}:charts`);
    await cacheService.del(`chart:${id}:full`);
    await cacheService.del(`chart:${id}:data`); // Invalidate processed chart data cache
    await cacheService.del(`dashboard:${updatedChart.dashboard.id}:full`); // Invalidate dashboard cache
    return updatedChart;
  } catch (error: any) {
    logger.error(`Failed to update chart: ${error.message}`, { userId, id, data, error });
    throw new AppError('Failed to update chart', 500);
  }
};

export const deleteChart = async (userId: string, id: string): Promise<void> => {
  const chart = await getChartById(userId, id); // Includes ownership check
  try {
    await chartRepository.remove(chart);
    await cacheService.del(`user:${userId}:charts`);
    await cacheService.del(`chart:${id}:full`);
    await cacheService.del(`chart:${id}:data`);
    await cacheService.del(`dashboard:${chart.dashboard.id}:full`); // Invalidate dashboard cache
  } catch (error: any) {
    logger.error(`Failed to delete chart: ${error.message}`, { userId, id, error });
    throw new AppError('Failed to delete chart', 500);
  }
};

export const getChartData = async (userId: string, chartId: string): Promise<any[]> => {
  const chart = await chartRepository.findOne({
    where: { id: chartId, userId },
    relations: ['dataSource'],
  });

  if (!chart) {
    throw new AppError('Chart not found or you do not have access', 404);
  }

  const cacheKey = `chart:${chartId}:data`;
  const cachedData = await cacheService.get<any[]>(cacheKey);
  if (cachedData) {
    logger.info(`Serving processed chart data for chart ${chartId} from cache.`);
    return cachedData;
  }

  const rawDataSourceData = await getProcessedDataSourceData(userId, chart.dataSource.id);
  const chartConfig = chart.configuration as Record<string, any>;

  let transformedData: any[] = [];

  // Data transformation logic based on chart type and configuration
  switch (chart.type) {
    case 'bar':
    case 'line': {
      const { xAxis, yAxis } = chartConfig;
      if (!xAxis || !yAxis) {
        throw new AppError('Chart configuration missing xAxis or yAxis for bar/line chart.', 400);
      }
      // Group by xAxis and sum/avg yAxis
      const groupedData = rawDataSourceData.reduce((acc, row) => {
        const xValue = row[xAxis];
        const yValue = row[yAxis];
        if (xValue !== undefined && yValue !== undefined && typeof yValue === 'number') {
          if (!acc[xValue]) {
            acc[xValue] = { [xAxis]: xValue, [yAxis]: 0, count: 0 };
          }
          acc[xValue][yAxis] += yValue;
          acc[xValue].count++;
        }
        return acc;
      }, {});
      transformedData = Object.values(groupedData).map((item: any) => ({
        ...item,
        // Optionally average yAxis if needed
        // [yAxis]: item[yAxis] / item.count
      }));
      break;
    }
    case 'pie': {
      const { category, value } = chartConfig;
      if (!category || !value) {
        throw new AppError('Chart configuration missing category or value for pie chart.', 400);
      }
      const groupedData = rawDataSourceData.reduce((acc, row) => {
        const cat = row[category];
        const val = row[value];
        if (cat !== undefined && val !== undefined && typeof val === 'number') {
          if (!acc[cat]) {
            acc[cat] = { id: cat, label: cat, value: 0 };
          }
          acc[cat].value += val;
        }
        return acc;
      }, {});
      transformedData = Object.values(groupedData);
      break;
    }
    case 'scatterplot': {
      const { xAxis, yAxis } = chartConfig;
      if (!xAxis || !yAxis) {
        throw new AppError('Chart configuration missing xAxis or yAxis for scatterplot.', 400);
      }
      transformedData = rawDataSourceData.map(row => ({
        x: row[xAxis],
        y: row[yAxis],
        // Optionally add more data for tooltips etc.
        id: `${row[xAxis]}-${row[yAxis]}-${Math.random()}`, // Unique ID for Nivo scatterplot
        data: row // Original row data
      })).filter(d => typeof d.x === 'number' && typeof d.y === 'number'); // Filter out non-numeric values
      break;
    }
    default:
      throw new AppError(`Unsupported chart type for data processing: ${chart.type}`, 400);
  }

  await cacheService.set(cacheKey, transformedData, 60 * 10); // Cache for 10 minutes
  return transformedData;
};
```