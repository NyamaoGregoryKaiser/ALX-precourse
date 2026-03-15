const request = require('supertest');
const app = require('../../src/app');
const { sequelize } = require('../../src/db/models');
const { generateUniqueId } = require('../../src/utils/helpers');
const { Customer } = require('../../src/db/models');

let adminToken;
let customerToken;
let adminUser;
let testCustomer;

beforeAll(async () => {
  await sequelize.sync({ force: true }); // Clear DB for tests
  // Create an admin user for testing
  adminUser = await Customer.create({
    id: generateUniqueId('cust'),
    name: 'Test Admin',
    email: 'testadmin@example.com',
    password: 'password123',
    role: 'admin',
  });

  // Create a customer user for testing
  testCustomer = await Customer.create({
    id: generateUniqueId('cust'),
    name: 'Normal Customer',
    email: 'normalcustomer@example.com',
    password: 'password123',
    role: 'customer',
  });

  // Log in admin to get token
  const adminRes = await request(app).post('/api/v1/auth/login').send({
    email: 'testadmin@example.com',
    password: 'password123',
  });
  adminToken = adminRes.body.token;

  // Log in customer to get token
  const customerRes = await request(app).post('/api/v1/auth/login').send({
    email: 'normalcustomer@example.com',
    password: 'password123',
  });
  customerToken = customerRes.body.token;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Customer API', () => {
  describe('GET /api/v1/customers', () => {
    it('should allow admin to fetch all customers', async () => {
      const res = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.customers).toBeInstanceOf(Array);
      expect(res.body.data.customers.length).toBeGreaterThanOrEqual(2); // Admin and Test Customer
    });

    it('should forbid regular customer from fetching all customers', async () => {
      const res = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toBe('You do not have permission to perform this action');
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app).get('/api/v1/customers');
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('You are not logged in! Please log in to get access.');
    });
  });

  describe('POST /api/v1/customers', () => {
    it('should allow admin to create a new customer', async () => {
      const customerData = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'securepassword',
        role: 'customer',
      };
      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(customerData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.customer.name).toBe('New User');
      expect(res.body.data.customer.email).toBe('newuser@example.com');
      expect(res.body.data.customer.role).toBe('customer');
      expect(res.body.data.customer.password).toBeUndefined(); // Password should not be returned
    });

    it('should forbid regular customer from creating a new customer', async () => {
      const customerData = {
        name: 'Another User',
        email: 'anotheruser@example.com',
        password: 'securepassword',
        role: 'customer',
      };
      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(customerData);

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toBe('You do not have permission to perform this action');
    });

    it('should return 400 for invalid customer data', async () => {
      const invalidData = {
        name: 'Invalid',
        email: 'not-an-email', // Invalid email
        password: '123',
        role: 'customer',
      };
      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('must be a valid email');
    });
  });

  describe('GET /api/v1/customers/:id', () => {
    it('should allow admin to fetch a customer by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/customers/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.customer.id).toBe(adminUser.id);
      expect(res.body.data.customer.email).toBe(adminUser.email);
    });

    it('should allow a customer to fetch their own profile', async () => {
        const res = await request(app)
          .get(`/api/v1/customers/${testCustomer.id}`)
          .set('Authorization', `Bearer ${customerToken}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.customer.id).toBe(testCustomer.id);
        expect(res.body.data.customer.email).toBe(testCustomer.email);
    });

    it('should forbid a customer from fetching another customer\'s profile', async () => {
        const res = await request(app)
          .get(`/api/v1/customers/${adminUser.id}`) // Customer trying to fetch admin's profile
          .set('Authorization', `Bearer ${customerToken}`);
        expect(res.statusCode).toEqual(403);
        expect(res.body.message).toBe('You do not have permission to perform this action');
    });

    it('should return 404 for a non-existent customer ID', async () => {
      const nonExistentId = generateUniqueId('cust');
      const res = await request(app)
        .get(`/api/v1/customers/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toBe('No customer found with that ID');
    });
  });

  // Add tests for PATCH and DELETE operations, ensuring authorization rules are respected
});