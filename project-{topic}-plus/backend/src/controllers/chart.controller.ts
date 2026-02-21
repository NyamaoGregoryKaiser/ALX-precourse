```typescript
import { Request, Response, NextFunction } from 'express';
import * as chartService from '../services/chart.service';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

export const createChart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    const chart = await chartService.createChart(userId, req.body);
    res.status(201).json({ status: 'success', data: chart });
  } catch (error: any) {
    logger.error(`Create chart error: ${error.message}`, { userId: (req.user as any)?.id, body: req.body, error });
    next(error);
  }
};

export const getAllCharts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    const charts = await chartService.getAllCharts(userId);
    res.status(200).json({ status: 'success', data: charts });
  } catch (error: any) {
    logger.error(`Get all charts error: ${error.message}`, { userId: (req.user as any)?.id, error });
    next(error);
  }
};

export const getChartById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    const chartId = req.params.id;
    const chart = await chartService.getChartById(userId, chartId);
    res.status(200).json({ status: 'success', data: chart });
  } catch (error: any) {
    logger.error(`Get chart by ID error: ${error.message}`, { id: req.params.id, userId: (req.user as any)?.id, error });
    next(error);
  }
};

export const updateChart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    const chartId = req.params.id;
    const updatedChart = await chartService.updateChart(userId, chartId, req.body);
    res.status(200).json({ status: 'success', data: updatedChart });
  } catch (error: any) {
    logger.error(`Update chart error: ${error.message}`, { id: req.params.id, userId: (req.user as any)?.id, body: req.body, error });
    next(error);
  }
};

export const deleteChart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    const chartId = req.params.id;
    await chartService.deleteChart(userId, chartId);
    res.status(204).send(); // No Content
  } catch (error: any) {
    logger.error(`Delete chart error: ${error.message}`, { id: req.params.id, userId: (req.user as any)?.id, error });
    next(error);
  }
};

export const getChartData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    const chartId = req.params.id;
    const chartData = await chartService.getChartData(userId, chartId);
    res.status(200).json({ status: 'success', data: chartData });
  } catch (error: any) {
    logger.error(`Get chart data error: ${error.message}`, { id: req.params.id, userId: (req.user as any)?.id, error });
    next(error);
  }
};
```