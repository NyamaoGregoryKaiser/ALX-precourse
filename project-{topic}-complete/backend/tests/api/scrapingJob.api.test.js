```javascript
const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const db = require('../../src/db');
const User = require('../../src/models/user.model');
const ScrapingJob = require('../../src/models/scrapingJob.model');
const config = require('../../src/config');
const schedulerService = require('../../src/services/scheduler.service');

// Mock scheduler service to prevent actual cron jobs from running during tests
jest.mock('../../src/services/scheduler.service', () => ({
    start: jest.fn(),
    addJob: jest.fn(),
    removeJob: jest.fn(),
    updateJob: jest.fn(),
    stop: jest.fn(),
}));

// Helper function to get an auth token for a user
const getAuthToken = async (email, password) => {
    const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password });
    return res.body.data.token;
};

describe('ScrapingJob API Tests', () => {
    let adminToken;
    let userToken;
    let adminUser;
    let regularUser;
    let adminJob;
    let userJob;

    beforeAll(async () => {
        await db.migrate.latest();
    });

    beforeEach(async () => {
        // Clear tables and seed users before each test
        await db('job_logs').del();
        await db('scraped_data').del();
        await db('scraping_jobs').del();
        await db('users').del();
        await db.seed.run(); // Seeds admin and regular user

        adminUser = await User.findByEmail(config.adminEmail);
        regularUser = await User.findByEmail('user@example.com');

        adminToken = await getAuthToken(config.adminEmail, config.adminPassword);
        userToken = await getAuthToken('user@example.com', 'userpassword123');

        // Create some jobs for testing
        adminJob = await ScrapingJob.create(
            adminUser.id,
            'Admin Test Job',
            'http://admin-site.com',
            { title: 'h1' },
            'static',
            '0 * * * *',
            true
        );
        userJob = await ScrapingJob.create(
            regularUser.id,
            'User Test Job',
            'http://user-site.com',
            { description: '.desc' },
            'dynamic',
            null,
            true
        );
        jest.clearAllMocks(); // Clear mocks after setup
    });

    afterAll(async () => {
        await db.migrate.rollback();
        await db.destroy();
    });

    describe('POST /api/jobs', () => {
        test('should create a new scraping job for an authenticated user', async () => {
            const newJob = {
                name: 'New Job for User',
                start_url: 'http://newsite.com',
                selectors: { headline: '.title' },
                scrape_type: 'static',
                schedule_cron: '*/5 * * * *',
                is_active: true,
            };

            const res = await request(app)
                .post('/api/jobs')
                .set('Authorization', `Bearer ${userToken}`)
                .send(newJob)
                .expect(httpStatus.CREATED);

            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe(newJob.name);
            expect(res.body.data.user_id).toBe(regularUser.id);
            expect(schedulerService.addJob).toHaveBeenCalledTimes(1);
        });

        test('should return 400 if required fields are missing', async () => {
            await request(app)
                .post('/api/jobs')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ name: 'Partial Job' }) // Missing start_url, selectors, scrape_type
                .expect(httpStatus.BAD_REQUEST);
        });

        test('should return 401 if unauthenticated', async () => {
            await request(app)
                .post('/api/jobs')
                .send({})
                .expect(httpStatus.UNAUTHORIZED);
        });
    });

    describe('GET /api/jobs', () => {
        test('should return 200 and all jobs for admin', async () => {
            const res = await request(app)
                .get('/api/jobs')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(httpStatus.OK);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeInstanceOf(Array);
            expect(res.body.data.length).toBe(2); // Admin job + User job
            expect(res.body.data[0].selectors).toBeInstanceOf(Object); // Should be parsed JSON
        });

        test('should return 200 and only user\'s jobs for a regular user', async () => {
            const res = await request(app)
                .get('/api/jobs')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(httpStatus.OK);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeInstanceOf(Array);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].id).toBe(userJob.id);
            expect(res.body.data[0].selectors).toBeInstanceOf(Object);
        });

        test('should return 401 if unauthenticated', async () => {
            await request(app)
                .get('/api/jobs')
                .expect(httpStatus.UNAUTHORIZED);
        });
    });

    describe('GET /api/jobs/:jobId', () => {
        test('should return 200 and job details for admin accessing any job', async () => {
            const res = await request(app)
                .get(`/api/jobs/${userJob.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(httpStatus.OK);

            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(userJob.id);
            expect(res.body.data.user_id).toBe(userJob.user_id);
            expect(res.body.data.selectors).toBeInstanceOf(Object);
        });

        test('should return 200 and job details for user accessing their own job', async () => {
            const res = await request(app)
                .get(`/api/jobs/${userJob.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(httpStatus.OK);

            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(userJob.id);
        });

        test('should return 403 for user accessing another user\'s job', async () => {
            await request(app)
                .get(`/api/jobs/${adminJob.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(httpStatus.FORBIDDEN);
        });

        test('should return 404 if job not found', async () => {
            await request(app)
                .get('/api/jobs/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(httpStatus.NOT_FOUND);
        });
    });

    describe('PATCH /api/jobs/:jobId', () => {
        test('should allow admin to update any job', async () => {
            const updateBody = { name: 'Updated Admin Job', is_active: false };
            const res = await request(app)
                .patch(`/api/jobs/${adminJob.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateBody)
                .expect(httpStatus.OK);

            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe(updateBody.name);
            expect(res.body.data.is_active).toBe(updateBody.is_active);
            expect(schedulerService.removeJob).toHaveBeenCalledWith(adminJob.id); // Job became inactive
        });

        test('should allow user to update their own job', async () => {
            const updateBody = { scrape_type: 'static', schedule_cron: '0 1 * * *' };
            const res = await request(app)
                .patch(`/api/jobs/${userJob.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(updateBody)
                .expect(httpStatus.OK);

            expect(res.body.success).toBe(true);
            expect(res.body.data.scrape_type).toBe(updateBody.scrape_type);
            expect(schedulerService.updateJob).toHaveBeenCalledTimes(1);
        });

        test('should return 403 if user tries to update another user\'s job', async () => {
            await request(app)
                .patch(`/api/jobs/${adminJob.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ name: 'Hacked Job' })
                .expect(httpStatus.FORBIDDEN);
        });

        test('should return 404 if job not found for update', async () => {
            await request(app)
                .patch('/api/jobs/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Nonexistent' })
                .expect(httpStatus.NOT_FOUND);
        });
    });

    describe('DELETE /api/jobs/:jobId', () => {
        test('should allow admin to delete any job', async () => {
            await request(app)
                .delete(`/api/jobs/${userJob.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(httpStatus.NO_CONTENT);

            const deletedJob = await ScrapingJob.findById(userJob.id);
            expect(deletedJob).toBeUndefined();
            expect(schedulerService.removeJob).toHaveBeenCalledWith(userJob.id);
        });

        test('should allow user to delete their own job', async () => {
            await request(app)
                .delete(`/api/jobs/${userJob.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(httpStatus.NO_CONTENT);

            const deletedJob = await ScrapingJob.findById(userJob.id);
            expect(deletedJob).toBeUndefined();
        });

        test('should return 403 if user tries to delete another user\'s job', async () => {
            await request(app)
                .delete(`/api/jobs/${adminJob.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(httpStatus.FORBIDDEN);
        });

        test('should return 404 if job not found for deletion', async () => {
            await request(app)
                .delete('/api/jobs/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(httpStatus.NOT_FOUND);
        });
    });

    describe('POST /api/jobs/:jobId/run', () => {
        test('should enqueue a job for immediate run if user owns it', async () => {
            const scraperServiceMock = require('../../src/services/scraper.service');
            scraperServiceMock.enqueueScrape = jest.fn(); // Mock scraper enqueue

            await request(app)
                .post(`/api/jobs/${userJob.id}/run`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(httpStatus.ACCEPTED);

            expect(scraperServiceMock.enqueueScrape).toHaveBeenCalledWith(expect.objectContaining({ id: userJob.id }));
            expect(ScrapingJob.logJob).toHaveBeenCalledWith(userJob.id, 'info', 'Manually triggered scrape.');
        });

        test('should return 403 if user does not own the job', async () => {
            await request(app)
                .post(`/api/jobs/${adminJob.id}/run`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(httpStatus.FORBIDDEN);
        });

        test('should return 404 if job not found', async () => {
            await request(app)
                .post('/api/jobs/99999/run')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(httpStatus.NOT_FOUND);
        });
    });
});
```