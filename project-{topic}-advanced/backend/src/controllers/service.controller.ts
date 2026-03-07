```typescript
import { Request, Response, NextFunction } from 'express';
import * as serviceService from '../services/service.service';
import { CreateServiceDto, UpdateServiceDto } from './dtos/service.dto';
import { UserRole } from '../entities/User';
import logger from '../utils/logger';

export const createService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body as CreateServiceDto;
    const userId = req.user!.id; // `protect` middleware ensures req.user exists

    const newService = await serviceService.createService(name, description, userId);
    res.status(201).json({ status: 'success', data: newService });
  } catch (error) {
    next(error);
  }
};

export const getServices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const roles = req.user!.roles;

    const services = await serviceService.getAllServices(userId, roles);
    res.status(200).json({ status: 'success', data: services });
  } catch (error) {
    next(error);
  }
};

export const getServiceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const serviceId = req.params.id;
    const userId = req.user!.id;
    const roles = req.user!.roles;

    const service = await serviceService.getServiceById(serviceId, userId, roles);
    res.status(200).json({ status: 'success', data: service });
  } catch (error) {
    next(error);
  }
};

export const updateService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const serviceId = req.params.id;
    const userId = req.user!.id;
    const roles = req.user!.roles;
    const { name, description } = req.body as UpdateServiceDto;

    const updatedService = await serviceService.updateService(serviceId, userId, roles, name, description);
    res.status(200).json({ status: 'success', data: updatedService });
  } catch (error) {
    next(error);
  }
};

export const deleteService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const serviceId = req.params.id;
    const userId = req.user!.id;
    const roles = req.user!.roles;

    await serviceService.deleteService(serviceId, userId, roles);
    res.status(204).send(); // No content
  } catch (error) {
    next(error);
  }
};

export const regenerateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const serviceId = req.params.id;
    const userId = req.user!.id;
    const roles = req.user!.roles;

    const newApiKey = await serviceService.regenerateApiKey(serviceId, userId, roles);
    res.status(200).json({ status: 'success', data: { apiKey: newApiKey } });
  } catch (error) {
    next(error);
  }
};
```