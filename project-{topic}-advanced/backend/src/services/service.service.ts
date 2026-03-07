```typescript
import { AppDataSource } from '../data-source';
import { Service } from '../entities/Service';
import { User } from '../entities/User';
import { MetricDefinition } from '../entities/MetricDefinition';
import { BadRequestError, NotFoundError, ForbiddenError } from '../middleware/errorHandler.middleware';
import { UserRole } from '../entities/User';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

const serviceRepository = AppDataSource.getRepository(Service);
const userRepository = AppDataSource.getRepository(User);

export const createService = async (
  name: string,
  description: string | undefined,
  userId: string
): Promise<Service> => {
  // Ensure the user exists
  const user = await userRepository.findOneBy({ id: userId });
  if (!user) {
    throw new NotFoundError('User not found.');
  }

  // Check if a service with the same name already exists for this user
  const existingService = await serviceRepository.findOne({ where: { name, user } });
  if (existingService) {
    throw new BadRequestError('A service with this name already exists for your account.');
  }

  const newService = serviceRepository.create({
    name,
    description,
    apiKey: uuidv4(), // Generate a unique API key
    userId,
    user,
  });

  await serviceRepository.save(newService);
  logger.info(`Service created: ${newService.name} (ID: ${newService.id}) by user ${userId}`);
  return newService;
};

export const getAllServices = async (userId: string, roles: UserRole[]): Promise<Service[]> => {
  if (roles.includes(UserRole.ADMIN)) {
    // Admins can see all services
    return serviceRepository.find({ relations: ['user'] });
  } else {
    // Regular users/service owners only see their own services
    return serviceRepository.find({ where: { userId }, relations: ['user'] });
  }
};

export const getServiceById = async (serviceId: string, userId: string, roles: UserRole[]): Promise<Service> => {
  const service = await serviceRepository.findOne({ where: { id: serviceId }, relations: ['user'] });

  if (!service) {
    throw new NotFoundError('Service not found.');
  }

  if (!roles.includes(UserRole.ADMIN) && service.userId !== userId) {
    throw new ForbiddenError('You do not have access to this service.');
  }
  return service;
};

export const updateService = async (
  serviceId: string,
  userId: string,
  roles: UserRole[],
  name?: string,
  description?: string
): Promise<Service> => {
  const service = await getServiceById(serviceId, userId, roles); // Re-uses permission check

  if (name && name !== service.name) {
    const existingService = await serviceRepository.findOne({
      where: { name, userId: service.userId },
    });
    if (existingService && existingService.id !== serviceId) {
      throw new BadRequestError('A service with this name already exists for your account.');
    }
    service.name = name;
  }
  if (description !== undefined) {
    service.description = description;
  }

  await serviceRepository.save(service);
  logger.info(`Service updated: ${service.name} (ID: ${service.id}) by user ${userId}`);
  return service;
};

export const deleteService = async (serviceId: string, userId: string, roles: UserRole[]): Promise<void> => {
  const service = await getServiceById(serviceId, userId, roles); // Re-uses permission check

  await serviceRepository.remove(service);
  logger.info(`Service deleted: ${service.name} (ID: ${service.id}) by user ${userId}`);
};

export const regenerateApiKey = async (serviceId: string, userId: string, roles: UserRole[]): Promise<string> => {
  const service = await getServiceById(serviceId, userId, roles); // Re-uses permission check

  service.apiKey = uuidv4();
  await serviceRepository.save(service);
  logger.info(`API Key regenerated for service: ${service.name} (ID: ${service.id}) by user ${userId}`);
  return service.apiKey;
};

export const getServiceByApiKey = async (apiKey: string): Promise<Service> => {
  const service = await serviceRepository.findOneBy({ apiKey });
  if (!service) {
    throw new UnauthorizedError('Invalid API Key provided.');
  }
  return service;
};
```