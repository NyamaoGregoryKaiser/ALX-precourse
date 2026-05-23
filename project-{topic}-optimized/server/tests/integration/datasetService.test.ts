import { AppDataSource } from '../../src/database/data-source';
import { Dataset } from '../../src/modules/datasets/entities/Dataset';
import { User } from '../../src/modules/auth/entities/User';
import * as datasetService from '../../src/modules/datasets/services/datasetService';
import { NotFoundError } from '../../src/utils/errors';
import bcrypt from 'bcryptjs';

describe('DatasetService Integration Tests', () => {
  let adminUser: User;
  let regularUser: User;
  let testDataset: Dataset;

  beforeEach(async () => {
    // Clear database before each test (handled by jest.setup.ts, but re-assert here)
    const userRepository = AppDataSource.getRepository(User);
    const datasetRepository = AppDataSource.getRepository(Dataset);

    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser = userRepository.create({
      username: 'adminTest',
      email: 'adminTest@example.com',
      password: hashedPassword,
      role: 'admin',
    });
    regularUser = userRepository.create({
      username: 'userTest',
      email: 'userTest@example.com',
      password: hashedPassword,
      role: 'user',
    });
    await userRepository.save([adminUser, regularUser]);

    // Create a test dataset
    testDataset = datasetRepository.create({
      name: 'Test Dataset',
      description: 'A dataset for integration tests',
      version: '1.0.0',
      schemaJson: { col1: 'number', col2: 'string' },
      fileUrl: '/uploads/test_dataset.csv',
      createdBy: adminUser,
    });
    await datasetRepository.save(testDataset);
  });

  describe('findAllDatasets', () => {
    it('should return all datasets with createdBy user relation', async () => {
      const datasets = await datasetService.findAllDatasets();
      expect(datasets).toHaveLength(1);
      expect(datasets[0].name).toBe('Test Dataset');
      expect(datasets[0].createdBy?.username).toBe('adminTest');
    });
  });

  describe('findDatasetById', () => {
    it('should return a dataset by its ID', async () => {
      const foundDataset = await datasetService.findDatasetById(testDataset.id);
      expect(foundDataset.id).toBe(testDataset.id);
      expect(foundDataset.name).toBe('Test Dataset');
      expect(foundDataset.createdBy?.username).toBe('adminTest');
    });

    it('should throw NotFoundError if dataset does not exist', async () => {
      await expect(datasetService.findDatasetById('non-existent-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createDataset', () => {
    it('should create a new dataset', async () => {
      const newDatasetData = {
        name: 'New Dataset',
        description: 'A newly created dataset',
        fileUrl: '/uploads/new_data.csv',
        schemaJson: { newCol: 'boolean' },
        createdBy: regularUser,
      };
      const createdDataset = await datasetService.createDataset(newDatasetData);

      expect(createdDataset).toBeDefined();
      expect(createdDataset.name).toBe('New Dataset');
      expect(createdDataset.description).toBe('A newly created dataset');
      expect(createdDataset.createdById).toBe(regularUser.id);

      const found = await AppDataSource.getRepository(Dataset).findOne({ where: { id: createdDataset.id }, relations: ['createdBy'] });
      expect(found).toBeDefined();
      expect(found?.createdBy?.username).toBe('userTest');
    });
  });

  describe('updateDataset', () => {
    it('should update an existing dataset', async () => {
      const updateData = { name: 'Updated Dataset Name', version: '2.0.0' };
      const updatedDataset = await datasetService.updateDataset(testDataset.id, updateData);

      expect(updatedDataset.id).toBe(testDataset.id);
      expect(updatedDataset.name).toBe('Updated Dataset Name');
      expect(updatedDataset.version).toBe('2.0.0');
    });

    it('should throw NotFoundError if dataset to update does not exist', async () => {
      await expect(datasetService.updateDataset('non-existent-id', { name: 'Fail' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteDataset', () => {
    it('should delete an existing dataset', async () => {
      await datasetService.deleteDataset(testDataset.id);

      const found = await AppDataSource.getRepository(Dataset).findOne({ where: { id: testDataset.id } });
      expect(found).toBeNull();
    });

    it('should throw NotFoundError if dataset to delete does not exist', async () => {
      await expect(datasetService.deleteDataset('non-existent-id')).rejects.toThrow(NotFoundError);
    });
  });
});
```