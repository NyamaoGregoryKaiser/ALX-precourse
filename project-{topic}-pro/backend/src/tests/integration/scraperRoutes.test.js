const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../app');
const db = require('../../database/connection');
const User = require('../../database/models/User');
const Scraper = require('../../database/models/Scraper');
const authService = require('../../services/authService');

describe('Scraper API Endpoints', () => {
  let user;
  let token;

  beforeAll(async () => {
    // Clear data and set up a user for tests
    await db('scraped_items').del();
    await db('scrape_jobs').del();
    await db('scrapers').del();
    await db('users').del();

    user = await User.create({
      username: 'scraperuser',
      email: 'scraper@example.com',
      password: 'scraperpassword',
    });
    const tokens = authService.generateAuthTokens(user.id);
    token = tokens.token;
  });

  afterEach(async () => {
    // Clean up scrapers created during tests
    await db('scraped_items').del();
    await db('scrape_jobs').del();
    await db('scrapers').del();
  });

  describe('POST /api/scrapers', () => {
    test('should create a new scraper successfully', async () => {
      const scraperData = {
        name: 'Test Scraper',
        description: 'A test scraper for integration tests.',
        start_url: 'http://example.com',
        selectors_json: JSON.stringify({
          item: 'h1',
          fields: {
            title: 'h1',
          },
        }),
        scraping_method: 'cheerio',
      };

      const res = await request(app)
        .post('/api/scrapers')
        .set('Authorization', `Bearer ${token}`)
        .send(scraperData)
        .expect(httpStatus.CREATED);

      expect(res.body).toBeDefined();
      expect(res.body.name).toBe(scraperData.name);
      expect(res.body.user_id).toBe(user.id);
      expect(res.body.selectors_json).toBe(scraperData.selectors_json);
      expect(res.body.is_active).toBe(true); // Default value

      const storedScraper = await Scraper.findById(res.body.id);
      expect(storedScraper).toBeDefined();
      expect(storedScraper.name).toBe(scraperData.name);
    });

    test('should return 400 if validation fails for scraper creation', async () => {
      const invalidData = {
        name: 'Too', // Too short
        start_url: 'invalid-url',
        selectors_json: 'not-json',
      };

      await request(app)
        .post('/api/scrapers')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidData)
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 401 if no authentication token is provided', async () => {
      await request(app)
        .post('/api/scrapers')
        .send({
          name: 'Test Scraper',
          start_url: 'http://example.com',
          selectors_json: JSON.stringify({ item: 'h1', fields: { title: 'h1' } }),
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /api/scrapers', () => {
    test('should retrieve all scrapers for the authenticated user', async () => {
      await Scraper.create({
        user_id: user.id,
        name: 'Scraper 1',
        start_url: 'http://example1.com',
        selectors_json: JSON.stringify({ item: 'div', fields: { content: 'p' } }),
      });
      await Scraper.create({
        user_id: user.id,
        name: 'Scraper 2',
        start_url: 'http://example2.com',
        selectors_json: JSON.stringify({ item: 'article', fields: { title: 'h2' } }),
      });

      const res = await request(app)
        .get('/api/scrapers')
        .set('Authorization', `Bearer ${token}`)
        .expect(httpStatus.OK);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(2);
      expect(res.body[0].user_id).toBe(user.id);
    });

    test('should return an empty array if no scrapers found for the user', async () => {
      await db('scrapers').del(); // Ensure no scrapers for this user

      const res = await request(app)
        .get('/api/scrapers')
        .set('Authorization', `Bearer ${token}`)
        .expect(httpStatus.OK);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(0);
    });
  });

  describe('GET /api/scrapers/:scraperId', () => {
    let createdScraper;
    beforeEach(async () => {
      createdScraper = await Scraper.create({
        user_id: user.id,
        name: 'Detail Scraper',
        start_url: 'http://example.com/detail',
        selectors_json: JSON.stringify({ item: 'section', fields: { text: 'span' } }),
      });
    });

    test('should retrieve a single scraper by ID if owned by user', async () => {
      const res = await request(app)
        .get(`/api/scrapers/${createdScraper.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(httpStatus.OK);

      expect(res.body.id).toBe(createdScraper.id);
      expect(res.body.name).toBe(createdScraper.name);
    });

    test('should return 404 if scraper not found', async () => {
      await request(app)
        .get(`/api/scrapers/nonexistent-id`) // UUID format but not existing
        .set('Authorization', `Bearer ${token}`)
        .expect(httpStatus.NOT_FOUND);
    });

    test('should return 404 if scraper is not owned by the user', async () => {
      const otherUser = await User.create({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'otherpassword',
      });
      const otherScraper = await Scraper.create({
        user_id: otherUser.id,
        name: 'Other Scraper',
        start_url: 'http://other.com',
        selectors_json: JSON.stringify({ item: 'p', fields: { content: 'p' } }),
      });

      await request(app)
        .get(`/api/scrapers/${otherScraper.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(httpStatus.NOT_FOUND); // Should be 404, not 403, for data security (hiding existence)
    });
  });

  describe('PATCH /api/scrapers/:scraperId', () => {
    let createdScraper;
    beforeEach(async () => {
      createdScraper = await Scraper.create({
        user_id: user.id,
        name: 'Patch Scraper',
        start_url: 'http://example.com/patch',
        selectors_json: JSON.stringify({ item: 'section', fields: { text: 'span' } }),
      });
    });

    test('should update an existing scraper', async () => {
      const updateData = {
        name: 'Updated Scraper Name',
        is_active: false,
      };

      const res = await request(app)
        .patch(`/api/scrapers/${createdScraper.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(httpStatus.OK);

      expect(res.body.name).toBe(updateData.name);
      expect(res.body.is_active).toBe(updateData.is_active);

      const storedScraper = await Scraper.findById(createdScraper.id);
      expect(storedScraper.name).toBe(updateData.name);
      expect(storedScraper.is_active).toBe(updateData.is_active);
    });

    test('should return 400 if validation fails for update', async () => {
      const invalidUpdateData = {
        name: 'X', // Too short
        start_url: 'invalid-url',
      };

      await request(app)
        .patch(`/api/scrapers/${createdScraper.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(invalidUpdateData)
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('DELETE /api/scrapers/:scraperId', () => {
    let createdScraper;
    beforeEach(async () => {
      createdScraper = await Scraper.create({
        user_id: user.id,
        name: 'Delete Scraper',
        start_url: 'http://example.com/delete',
        selectors_json: JSON.stringify({ item: 'main', fields: { text: 'p' } }),
      });
    });

    test('should delete an existing scraper', async () => {
      await request(app)
        .delete(`/api/scrapers/${createdScraper.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(httpStatus.NO_CONTENT);

      const storedScraper = await Scraper.findById(createdScraper.id);
      expect(storedScraper).toBeUndefined();
    });

    test('should return 404 if scraper to delete is not found', async () => {
      await request(app)
        .delete(`/api/scrapers/nonexistent-id`)
        .set('Authorization', `Bearer ${token}`)
        .expect(httpStatus.NOT_FOUND);
    });
  });

  // Example for trigger scrape (might need mocking BullMQ)
  describe('POST /api/scrapers/:scraperId/trigger', () => {
    let createdScraper;
    beforeEach(async () => {
      createdScraper = await Scraper.create({
        user_id: user.id,
        name: 'Trigger Scraper',
        start_url: 'http://example.com/trigger',
        selectors_json: JSON.stringify({ item: 'body', fields: { text: 'html' } }),
      });
    });

    test('should trigger a scrape job', async () => {
      // Mock BullMQ add function
      const { scrapeQueue } = require('../../jobs/queue');
      scrapeQueue.add = jest.fn().mockResolvedValue({ id: 'mock-job-id' });

      const res = await request(app)
        .post(`/api/scrapers/${createdScraper.id}/trigger`)
        .set('Authorization', `Bearer ${token}`)
        .expect(httpStatus.ACCEPTED);

      expect(res.body.message).toBe('Scrape job queued successfully');
      expect(res.body.jobId).toBe('mock-job-id');
      expect(scrapeQueue.add).toHaveBeenCalledWith(
        'scrape-task',
        { scraperId: createdScraper.id, startUrl: createdScraper.start_url }
      );
    });
  });
});