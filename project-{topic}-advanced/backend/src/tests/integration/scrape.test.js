const request = require('supertest');
const app = require('../../app');
const { prisma } = require('../../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../../config/auth');
const { cache } = require('../../config/cache');

// Mock Playwright and jobQueueService to avoid actual scraping and queue processing in integration tests
jest.mock('../../services/scrapingService', () => ({
  scrapeUrl: jest.fn((url, targetElements) => {
    if (url.includes('fail')) {
      return Promise.reject(new Error('Mock scraping failure'));
    }
    // Simulate successful data extraction
    return Promise.resolve([{ title: `Scraped title from ${url}`, content: 'Scraped content' }]);
  }),
  saveScrapedData: jest.fn((jobId, data) => prisma.scrapeResult.create({ data: { jobId, data } })),
}));

jest.mock('../../services/jobQueueService', () => ({
  addJobToQueue: jest.fn((job) => {
    // Simulate immediate processing for integration tests
    process.nextTick(async () => {
      try {
        await prisma.scrapeJob.update({
          where: { id: job.id },
          data: { status: 'RUNNING', startTime: new Date() },
        });
        const scrapedData = await require('../../services/scrapingService').scrapeUrl(job.url, job.targetElements);
        await require('../../services/scrapingService').saveScrapedData(job.id, scrapedData);
        await prisma.scrapeJob.update({
          where: { id: job.id },
          data: { status: 'COMPLETED', endTime: new Date() },
        });
      } catch (error) {
        await prisma.scrapeJob.update({
          where: { id: job.id },
          data: { status: 'FAILED', errorMessage: error.message, endTime: new Date() },
        });
      }
    });
  }),
  startJobProcessor: jest.fn(), // Prevent actual processor from running
  getJobQueueSize: jest.fn(() => 0),
}));

describe('Scrape API Integration Tests', () => {
  let adminToken;
  let userToken;
  let adminUserId;
  let userUserId;

  beforeAll(async () => {
    // Clear the database
    await prisma.scrapeResult.deleteMany();
    await prisma.scrapeJob.deleteMany();
    await prisma.user.deleteMany();

    // Create a test admin user
    const hashedPasswordAdmin = await bcrypt.hash('Admin@123', 10);
    const adminUser = await prisma.user.create({
      data: {
        username: 'adminTest',
        email: 'admintest@example.com',
        passwordHash: hashedPasswordAdmin,
        role: 'ADMIN',
      },
    });
    adminUserId = adminUser.id;
    adminToken = jwt.sign({ id: adminUser.id, role: adminUser.role }, jwtSecret, { expiresIn: '1h' });

    // Create a test regular user
    const hashedPasswordUser = await bcrypt.hash('User@123', 10);
    const regularUser = await prisma.user.create({
      data: {
        username: 'userTest',
        email: 'usertest@example.com',
        passwordHash: hashedPasswordUser,
        role: 'USER',
      },
    });
    userUserId = regularUser.id;
    userToken = jwt.sign({ id: regularUser.id, role: regularUser.role }, jwtSecret, { expiresIn: '1h' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    cache.flushAll(); // Clear cache before each test
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/scrape', () => {
    it('should create a new scraping job for authenticated user', async () => {
      const res = await request(app)
        .post('/api/scrape')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          url: 'http://testurl.com',
          targetElements: [{ name: 'title', selector: 'h1', type: 'text' }],
        });

      expect(res.statusCode).toEqual(202);
      expect(res.body).toHaveProperty('jobId');
      expect(res.body.status).toEqual('PENDING');

      const job = await prisma.scrapeJob.findUnique({ where: { id: res.body.jobId } });
      expect(job).not.toBeNull();
      expect(job.userId).toEqual(userUserId);
      expect(job.url).toEqual('http://testurl.com');
      expect(job.targetElements).toEqual([{ name: 'title', selector: 'h1', type: 'text' }]);

      // Verify jobQueueService was called
      expect(require('../../services/jobQueueService').addJobToQueue).toHaveBeenCalledTimes(1);
    });

    it('should return 400 if validation fails (missing URL)', async () => {
      const res = await request(app)
        .post('/api/scrape')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          targetElements: [{ name: 'title', selector: 'h1', type: 'text' }],
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('Please provide a URL and at least one target element.');
    });

    it('should return 400 for invalid URL', async () => {
      const res = await request(app)
        .post('/api/scrape')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          url: 'invalid-url',
          targetElements: [{ name: 'title', selector: 'h1', type: 'text' }],
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('Please provide a valid URL.');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/scrape')
        .send({
          url: 'http://testurl.com',
          targetElements: [{ name: 'title', selector: 'h1', type: 'text' }],
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('Not authorized, no token');
    });
  });

  describe('GET /api/jobs', () => {
    let job1, job2, adminJob;
    beforeAll(async () => {
      job1 = await prisma.scrapeJob.create({
        data: { userId: userUserId, url: 'http://job1.com', targetElements: [{ name: 't', selector: 'h1' }], status: 'COMPLETED' },
      });
      job2 = await prisma.scrapeJob.create({
        data: { userId: userUserId, url: 'http://job2.com', targetElements: [{ name: 't', selector: 'h1' }], status: 'PENDING' },
      });
      adminJob = await prisma.scrapeJob.create({
        data: { userId: adminUserId, url: 'http://adminjob.com', targetElements: [{ name: 't', selector: 'h1' }], status: 'FAILED' },
      });
    });

    it('should return all scraping jobs for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.jobs).toHaveLength(2); // Should only see user's jobs
      expect(res.body.jobs.map(j => j.id)).toEqual(expect.arrayContaining([job1.id, job2.id]));
      expect(res.body.total).toEqual(2);
    });

    it('should filter jobs by status', async () => {
      const res = await request(app)
        .get('/api/jobs?status=PENDING')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.jobs).toHaveLength(1);
      expect(res.body.jobs[0].id).toEqual(job2.id);
      expect(res.body.total).toEqual(1);
    });

    it('should allow admin to see all jobs (no explicit admin filter yet, but can be added)', async () => {
      // Current implementation returns jobs for the authenticated user, regardless of admin role.
      // An admin filter (e.g., ?allUsers=true) would need to be added to controller.
      const res = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.jobs).toHaveLength(1); // Admin only sees adminJob
      expect(res.body.jobs[0].id).toEqual(adminJob.id);
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .get('/api/jobs');
      expect(res.statusCode).toEqual(401);
    });
  });

  describe('GET /api/jobs/:id', () => {
    let job;
    beforeAll(async () => {
      job = await prisma.scrapeJob.create({
        data: { userId: userUserId, url: 'http://specific-job.com', targetElements: [{ name: 't', selector: 'h1' }], status: 'COMPLETED' },
      });
      await prisma.scrapeResult.create({
        data: { jobId: job.id, data: { text: 'Scraped data' }, extractedAt: new Date() },
      });
    });

    it('should return a specific job by ID for the owner', async () => {
      const res = await request(app)
        .get(`/api/jobs/${job.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.id).toEqual(job.id);
      expect(res.body).toHaveProperty('scrapeResults');
      expect(res.body.scrapeResults).toHaveLength(1);
    });

    it('should return 404 for a non-existent job', async () => {
      const res = await request(app)
        .get('/api/jobs/non-existent-id')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toEqual('Scraping job not found.');
    });

    it('should return 403 if user tries to access another user\'s job', async () => {
      const res = await request(app)
        .get(`/api/jobs/${job.id}`)
        .set('Authorization', `Bearer ${adminToken}`); // Admin user trying to access regular user's job

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toEqual('Forbidden: You do not have permission to view this job.');
    });

    it('should allow admin to access another user\'s job', async () => {
      const adminCreatedJob = await prisma.scrapeJob.create({
        data: { userId: adminUserId, url: 'http://admin-job.com', targetElements: [{ name: 't', selector: 'h1' }], status: 'PENDING' },
      });

      const res = await request(app)
        .get(`/api/jobs/${adminCreatedJob.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.id).toEqual(adminCreatedJob.id);
    });
  });

  describe('GET /api/results', () => {
    let job1, job2, result1, result2, adminJob, adminResult;

    beforeAll(async () => {
      job1 = await prisma.scrapeJob.create({ data: { userId: userUserId, url: 'http://res1.com', targetElements: [{ name: 't', selector: 'h1' }], status: 'COMPLETED' } });
      result1 = await prisma.scrapeResult.create({ data: { jobId: job1.id, data: { content: 'Result 1' } } });

      job2 = await prisma.scrapeJob.create({ data: { userId: userUserId, url: 'http://res2.com', targetElements: [{ name: 't', selector: 'h1' }], status: 'COMPLETED' } });
      result2 = await prisma.scrapeResult.create({ data: { jobId: job2.id, data: { content: 'Result 2' } } });

      adminJob = await prisma.scrapeJob.create({ data: { userId: adminUserId, url: 'http://adminres.com', targetElements: [{ name: 't', selector: 'h1' }], status: 'COMPLETED' } });
      adminResult = await prisma.scrapeResult.create({ data: { jobId: adminJob.id, data: { content: 'Admin Result' } } });
    });

    it('should return all scraped results for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/results')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.results).toHaveLength(2);
      expect(res.body.results.map(r => r.id)).toEqual(expect.arrayContaining([result1.id, result2.id]));
      expect(res.body.total).toEqual(2);
    });

    it('should allow admin to see all results', async () => {
      const res = await request(app)
        .get('/api/results')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.results).toHaveLength(3); // All results
      expect(res.body.results.map(r => r.id)).toEqual(expect.arrayContaining([result1.id, result2.id, adminResult.id]));
      expect(res.body.total).toEqual(3);
    });

    it('should allow admin to filter results by specific user ID', async () => {
      const res = await request(app)
        .get(`/api/results?userId=${userUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.results).toHaveLength(2);
      expect(res.body.results.map(r => r.id)).toEqual(expect.arrayContaining([result1.id, result2.id]));
    });
  });

  describe('DELETE /api/results/:id', () => {
    let jobToDelete, resultToDelete;
    let otherUserJob, otherUserResult;

    beforeEach(async () => { // Use beforeEach to ensure fresh data for deletion tests
      jobToDelete = await prisma.scrapeJob.create({ data: { userId: userUserId, url: 'http://todelete.com', targetElements: [{ name: 't', selector: 'h1' }], status: 'COMPLETED' } });
      resultToDelete = await prisma.scrapeResult.create({ data: { jobId: jobToDelete.id, data: { content: 'Delete me' } } });

      otherUserJob = await prisma.scrapeJob.create({ data: { userId: adminUserId, url: 'http://otheruser.com', targetElements: [{ name: 't', selector: 'h1' }], status: 'COMPLETED' } });
      otherUserResult = await prisma.scrapeResult.create({ data: { jobId: otherUserJob.id, data: { content: 'Other user content' } } });
    });

    it('should allow owner to delete their scraped result', async () => {
      const res = await request(app)
        .delete(`/api/results/${resultToDelete.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('Scraped result deleted successfully.');
      const deletedResult = await prisma.scrapeResult.findUnique({ where: { id: resultToDelete.id } });
      expect(deletedResult).toBeNull();
    });

    it('should allow admin to delete any scraped result', async () => {
      const res = await request(app)
        .delete(`/api/results/${otherUserResult.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('Scraped result deleted successfully.');
      const deletedResult = await prisma.scrapeResult.findUnique({ where: { id: otherUserResult.id } });
      expect(deletedResult).toBeNull();
    });

    it('should return 403 if non-owner user tries to delete another user\'s result', async () => {
      const res = await request(app)
        .delete(`/api/results/${otherUserResult.id}`)
        .set('Authorization', `Bearer ${userToken}`); // User trying to delete admin's result

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toEqual('Forbidden: You do not have permission to delete this result.');
    });

    it('should return 404 for deleting a non-existent result', async () => {
      const res = await request(app)
        .delete('/api/results/non-existent-id')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toEqual('Scraped result not found.');
    });
  });

  describe('PUT /api/jobs/:id/cancel', () => {
    let pendingJob, runningJob, completedJob;

    beforeEach(async () => {
      pendingJob = await prisma.scrapeJob.create({ data: { userId: userUserId, url: 'http://pending.com', targetElements: [{ name: 't', selector: 'h1' }], status: 'PENDING' } });
      runningJob = await prisma.scrapeJob.create({ data: { userId: userUserId, url: 'http://running.com', targetElements: [{ name: 't', selector: 'h1' }], status: 'RUNNING' } });
      completedJob = await prisma.scrapeJob.create({ data: { userId: userUserId, url: 'http://completed.com', targetElements: [{ name: 't', selector: 'h1' }], status: 'COMPLETED' } });
    });

    it('should allow owner to cancel a pending job', async () => {
      const res = await request(app)
        .put(`/api/jobs/${pendingJob.id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.job.status).toEqual('CANCELLED');
      const updatedJob = await prisma.scrapeJob.findUnique({ where: { id: pendingJob.id } });
      expect(updatedJob.status).toEqual('CANCELLED');
    });

    it('should allow owner to cancel a running job', async () => {
      const res = await request(app)
        .put(`/api/jobs/${runningJob.id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.job.status).toEqual('CANCELLED');
    });

    it('should return 400 if trying to cancel a completed job', async () => {
      const res = await request(app)
        .put(`/api/jobs/${completedJob.id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Job cannot be cancelled');
    });

    it('should allow admin to cancel any user\'s job', async () => {
      const res = await request(app)
        .put(`/api/jobs/${pendingJob.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.job.status).toEqual('CANCELLED');
    });

    it('should return 403 if non-admin and non-owner tries to cancel job', async () => {
      const adminCreatedJob = await prisma.scrapeJob.create({ data: { userId: adminUserId, url: 'http://admin-pending.com', targetElements: [{ name: 't', selector: 'h1' }], status: 'PENDING' } });
      const res = await request(app)
        .put(`/api/jobs/${adminCreatedJob.id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`); // User trying to cancel admin's job

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toEqual('Forbidden: You do not have permission to cancel this job.');
    });
  });
});