const projectService = require('../../services/project.service');
const prisma = require('../../../prisma/client');
const cacheService = require('../../services/cache.service');
const { USER_ROLES, ProjectStatus, CACHE_KEYS } = require('../../config/constants');

// Mock Prisma client
jest.mock('../../../prisma/client', () => ({
  project: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

// Mock cache service
jest.mock('../../services/cache.service', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
  deleteCache: jest.fn(),
  invalidateCacheByPattern: jest.fn()
}));

describe('Project Service', () => {
  const mockUserId = 'user123';
  const mockProject = {
    id: 'project123',
    name: 'Test Project',
    description: 'A test project description.',
    ownerId: mockUserId,
    status: ProjectStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    it('should create a new project', async () => {
      prisma.project.create.mockResolvedValue(mockProject);

      const projectData = { name: 'New Project', description: 'New project desc' };
      const result = await projectService.createProject(projectData, mockUserId);

      expect(prisma.project.create).toHaveBeenCalledWith({
        data: { ...projectData, ownerId: mockUserId }
      });
      expect(cacheService.invalidateCacheByPattern).toHaveBeenCalledWith(`${CACHE_KEYS.ALL_PROJECTS}*`);
      expect(result).toEqual(mockProject);
    });
  });

  describe('getAllProjects', () => {
    it('should return all projects from cache if available', async () => {
      cacheService.getCache.mockResolvedValue([mockProject]);
      const result = await projectService.getAllProjects();
      expect(cacheService.getCache).toHaveBeenCalledWith(CACHE_KEYS.ALL_PROJECTS);
      expect(prisma.project.findMany).not.toHaveBeenCalled();
      expect(result).toEqual([mockProject]);
    });

    it('should return all projects from DB if not in cache', async () => {
      cacheService.getCache.mockResolvedValue(null);
      prisma.project.findMany.mockResolvedValue([mockProject]);
      const result = await projectService.getAllProjects();
      expect(cacheService.getCache).toHaveBeenCalledWith(CACHE_KEYS.ALL_PROJECTS);
      expect(prisma.project.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object)
      });
      expect(cacheService.setCache).toHaveBeenCalledWith(CACHE_KEYS.ALL_PROJECTS, [mockProject], 300);
      expect(result).toEqual([mockProject]);
    });

    it('should return projects by ownerId', async () => {
      cacheService.getCache.mockResolvedValue(null);
      prisma.project.findMany.mockResolvedValue([mockProject]);
      const result = await projectService.getAllProjects(mockUserId);
      expect(cacheService.getCache).toHaveBeenCalledWith(`${CACHE_KEYS.ALL_PROJECTS}_user_${mockUserId}`);
      expect(prisma.project.findMany).toHaveBeenCalledWith({
        where: { ownerId: mockUserId },
        include: expect.any(Object)
      });
      expect(cacheService.setCache).toHaveBeenCalledWith(`${CACHE_KEYS.ALL_PROJECTS}_user_${mockUserId}`, [mockProject], 300);
      expect(result).toEqual([mockProject]);
    });
  });

  describe('getProjectById', () => {
    it('should return a project by ID from cache if available', async () => {
      cacheService.getCache.mockResolvedValue(mockProject);
      const result = await projectService.getProjectById(mockProject.id);
      expect(cacheService.getCache).toHaveBeenCalledWith(CACHE_KEYS.PROJECT_BY_ID(mockProject.id));
      expect(prisma.project.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual(mockProject);
    });

    it('should return a project by ID from DB if not in cache', async () => {
      cacheService.getCache.mockResolvedValue(null);
      prisma.project.findUnique.mockResolvedValue(mockProject);
      const result = await projectService.getProjectById(mockProject.id);
      expect(cacheService.getCache).toHaveBeenCalledWith(CACHE_KEYS.PROJECT_BY_ID(mockProject.id));
      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: mockProject.id },
        include: expect.any(Object)
      });
      expect(cacheService.setCache).toHaveBeenCalledWith(CACHE_KEYS.PROJECT_BY_ID(mockProject.id), mockProject, 300);
      expect(result).toEqual(mockProject);
    });

    it('should return null if project not found', async () => {
      cacheService.getCache.mockResolvedValue(null);
      prisma.project.findUnique.mockResolvedValue(null);
      const result = await projectService.getProjectById('nonexistentId');
      expect(result).toBeNull();
      expect(cacheService.setCache).not.toHaveBeenCalled();
    });
  });

  describe('updateProject', () => {
    it('should update a project and invalidate cache', async () => {
      const updateData = { name: 'Updated Project Name' };
      const updatedMockProject = { ...mockProject, ...updateData };
      prisma.project.update.mockResolvedValue(updatedMockProject);

      const result = await projectService.updateProject(mockProject.id, updateData);

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: mockProject.id },
        data: updateData
      });
      expect(cacheService.invalidateCacheByPattern).toHaveBeenCalledWith(`${CACHE_KEYS.ALL_PROJECTS}*`);
      expect(cacheService.invalidateCacheByPattern).toHaveBeenCalledWith(CACHE_KEYS.PROJECT_BY_ID(mockProject.id));
      expect(result).toEqual(updatedMockProject);
    });
  });

  describe('deleteProject', () => {
    it('should delete a project and invalidate cache', async () => {
      prisma.project.delete.mockResolvedValue(mockProject);

      const result = await projectService.deleteProject(mockProject.id);

      expect(prisma.project.delete).toHaveBeenCalledWith({
        where: { id: mockProject.id }
      });
      expect(cacheService.invalidateCacheByPattern).toHaveBeenCalledWith(`${CACHE_KEYS.ALL_PROJECTS}*`);
      expect(cacheService.invalidateCacheByPattern).toHaveBeenCalledWith(CACHE_KEYS.PROJECT_BY_ID(mockProject.id));
      expect(result).toEqual(mockProject);
    });
  });
});
```

#### Integration Tests (Examples)

##### `src/tests/integration/project.integration.test.js`

```javascript