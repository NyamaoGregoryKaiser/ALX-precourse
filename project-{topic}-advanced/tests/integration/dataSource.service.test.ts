```typescript
import { DataSourceService } from '../../src/services/dataSource.service';
import { AppDataSourceInstance } from '../../src/database';
import { User, UserRole } from '../../src/database/entities/User';
import { DataSource, DataSourceType } from '../../src/database/entities/DataSource';
import { CustomError } from '../../src/interfaces/error.interface';
import { DataSource as TypeORMDataSource } from 'typeorm';
import { IDataSourceConnectionConfig } from '../../src/interfaces/data.interface';
import * as DataProcessingUtils from '../../src/utils/dataProcessing.utils';

describe('DataSourceService Integration Tests', () => {
  let dataSourceService: DataSourceService;
  let testUser: User;
  let db: TypeORMDataSource;

  // Mock getDataService to control external data source connections
  const mockTestConnection = jest.fn();
  const mockDataService = {
    testConnection: mockTestConnection,
    connect: jest.fn(),
    query: jest.fn(),
    getSchema: jest.fn(),
  };

  beforeAll(async () => {
    // Ensure database is initialized as per jest.setup.ts
    await AppDataSourceInstance.initialize();
    db = AppDataSourceInstance;
    dataSourceService = new DataSourceService();

    // Mock the data service registry
    jest.spyOn(DataProcessingUtils, 'getDataService').mockReturnValue(mockDataService);
  });

  beforeEach(async () => {
    // Clear entities and re-seed minimal user data for each test
    await db.getRepository(DataSource).delete({});
    await db.getRepository(User).delete({});

    testUser = db.getRepository(User).create({
      id: 'test-user-id-123',
      email: 'testuser@example.com',
      password: 'hashedPassword', // Password hashing is tested in auth.service
      role: UserRole.USER,
    });
    await db.getRepository(User).save(testUser);

    mockTestConnection.mockResolvedValue(true); // Default to successful connection test
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('createDataSource', () => {
    it('should create a new data source successfully', async () => {
      const config: IDataSourceConnectionConfig = { host: 'localhost', port: 5432, database: 'testdb' };
      const newDataSource = await dataSourceService.createDataSource(
        'Test DB',
        DataSourceType.POSTGRES,
        config,
        testUser.id,
        'A test PostgreSQL database'
      );

      expect(newDataSource).toBeDefined();
      expect(newDataSource.name).toBe('Test DB');
      expect(newDataSource.type).toBe(DataSourceType.POSTGRES);
      expect(newDataSource.userId).toBe(testUser.id);
      expect(mockTestConnection).toHaveBeenCalledWith(config);

      const foundDataSource = await db.getRepository(DataSource).findOneBy({ id: newDataSource.id });
      expect(foundDataSource).toEqual(expect.objectContaining({
        name: 'Test DB',
        type: DataSourceType.POSTGRES,
        userId: testUser.id,
      }));
    });

    it('should throw CustomError if user not found', async () => {
      await expect(dataSourceService.createDataSource(
        'Test DB',
        DataSourceType.POSTGRES,
        { host: 'localhost' },
        'non-existent-user-id',
        'Description'
      )).rejects.toThrow(new CustomError(404, 'User not found.'));
    });

    it('should throw CustomError if data source connection fails', async () => {
      mockTestConnection.mockResolvedValue(false); // Simulate failed connection
      const config: IDataSourceConnectionConfig = { host: 'invalid', port: 1111, database: 'faildb' };

      await expect(dataSourceService.createDataSource(
        'Failed DB',
        DataSourceType.POSTGRES,
        config,
        testUser.id
      )).rejects.toThrow(new CustomError(400, 'Failed to connect to the provided data source with the given configuration.'));
      expect(mockTestConnection).toHaveBeenCalledWith(config);
    });
  });

  describe('getAllDataSources', () => {
    it('should return all data sources for a user', async () => {
      const ds1 = db.getRepository(DataSource).create({ name: 'DS1', type: DataSourceType.POSTGRES, connectionConfig: {}, userId: testUser.id, user: testUser });
      const ds2 = db.getRepository(DataSource).create({ name: 'DS2', type: DataSourceType.CSV_UPLOAD, connectionConfig: {}, userId: testUser.id, user: testUser });
      await db.getRepository(DataSource).save([ds1, ds2]);

      const dataSources = await dataSourceService.getAllDataSources(testUser.id);
      expect(dataSources).toHaveLength(2);
      expect(dataSources.map(ds => ds.name)).toEqual(expect.arrayContaining(['DS1', 'DS2']));
    });

    it('should return empty array if no data sources for user', async () => {
      const dataSources = await dataSourceService.getAllDataSources(testUser.id);
      expect(dataSources).toHaveLength(0);
    });
  });

  describe('getDataSourceById', () => {
    it('should return a data source by ID if user has access', async () => {
      const ds = db.getRepository(DataSource).create({ name: 'DS1', type: DataSourceType.POSTGRES, connectionConfig: {}, userId: testUser.id, user: testUser });
      await db.getRepository(DataSource).save(ds);

      const foundDs = await dataSourceService.getDataSourceById(ds.id, testUser.id);
      expect(foundDs.id).toBe(ds.id);
      expect(foundDs.name).toBe('DS1');
    });

    it('should throw CustomError if data source not found', async () => {
      await expect(dataSourceService.getDataSourceById('non-existent-id', testUser.id)).rejects.toThrow(
        new CustomError(404, 'Data source not found or you do not have permission to access it.')
      );
    });

    it('should throw CustomError if user does not own data source', async () => {
      const otherUser = db.getRepository(User).create({ id: 'other-user', email: 'other@example.com', password: 'hashed', role: UserRole.USER });
      await db.getRepository(User).save(otherUser);
      const ds = db.getRepository(DataSource).create({ name: 'DS1', type: DataSourceType.POSTGRES, connectionConfig: {}, userId: otherUser.id, user: otherUser });
      await db.getRepository(DataSource).save(ds);

      await expect(dataSourceService.getDataSourceById(ds.id, testUser.id)).rejects.toThrow(
        new CustomError(404, 'Data source not found or you do not have permission to access it.')
      );
    });
  });

  // ... similar tests for updateDataSource, deleteDataSource, testDataSourceConnection
});
```