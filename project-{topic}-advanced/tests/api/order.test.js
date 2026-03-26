```javascript
const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const { User, Product, Order } = require('../../src/models');
const { generateAuthTokens } = require('../../src/utils/jwt');
const setupTestDB = require('../jest.setup');

setupTestDB();

describe('Order API', () => {
  let adminUser, regularUser1, regularUser2;
  let adminAccessToken, regular1AccessToken, regular2AccessToken;
  let product1, product2;

  beforeEach(async () => {
    // Clear data and create fresh users/products/orders for each test
    await User.destroy({ truncate: true, cascade: true });
    await Product.destroy({ truncate: true, cascade: true });
    await Order.destroy({ truncate: true, cascade: true });

    adminUser = await User.create({
      name: 'Admin Order',
      email: 'admin.order@example.com',
      password: 'AdminPassword1',
      role: 'admin',
    });
    regularUser1 = await User.create({
      name: 'Regular User 1',
      email: 'user1.order@example.com',
      password: 'User1Password1',
      role: 'user',
    });
    regularUser2 = await User.create({
      name: 'Regular User 2',
      email: 'user2.order@example.com',
      password: 'User2Password1',
      role: 'user',
    });

    adminAccessToken = generateAuthTokens(adminUser.id).access.token;
    regular1AccessToken = generateAuthTokens(regularUser1.id).access.token;
    regular2AccessToken = generateAuthTokens(regularUser2.id).access.token;

    product1 = await Product.create({
      name: 'Product A',
      description: 'Description A',
      price: 50.00,
      stock: 100,
    });
    product2 = await Product.create({
      name: 'Product B',
      description: 'Description B',
      price: 25.00,
      stock: 50,
    });
  });

  describe('POST /api/v1/orders', () => {
    it('should allow a regular user to create an order for themselves', async () => {
      const orderBody = { productId: product1.id, quantity: 2 };

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${regular1AccessToken}`)
        .send(orderBody)
        .expect(httpStatus.CREATED);

      expect(res.body.userId).toBe(regularUser1.id);
      expect(res.body.productId).toBe(product1.id);
      expect(res.body.quantity).toBe(orderBody.quantity);
      expect(res.body.totalPrice).toBe((product1.price * orderBody.quantity).toFixed(2));
      expect(res.body.status).toBe('pending');

      const updatedProduct = await Product.findByPk(product1.id);
      expect(updatedProduct.stock).toBe(product1.stock - orderBody.quantity);
    });

    it('should allow an admin to create an order for any user', async () => {
      const orderBody = { userId: regularUser2.id, productId: product2.id, quantity: 3 };

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(orderBody)
        .expect(httpStatus.CREATED);

      expect(res.body.userId).toBe(regularUser2.id);
      expect(res.body.productId).toBe(product2.id);
      expect(res.body.quantity).toBe(orderBody.quantity);
      expect(res.body.totalPrice).toBe((product2.price * orderBody.quantity).toFixed(2));
      expect(res.body.status).toBe('pending');

      const updatedProduct = await Product.findByPk(product2.id);
      expect(updatedProduct.stock).toBe(product2.stock - orderBody.quantity);
    });

    it('should return 400 if not enough stock', async () => {
      const orderBody = { productId: product1.id, quantity: 200 }; // More than available stock

      await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${regular1AccessToken}`)
        .send(orderBody)
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should return 404 if product not found', async () => {
      const orderBody = { productId: 9999, quantity: 1 };

      await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${regular1AccessToken}`)
        .send(orderBody)
        .expect(httpStatus.NOT_FOUND);
    });

    it('should return 401 if no authentication token is provided', async () => {
      const orderBody = { productId: product1.id, quantity: 1 };
      await request(app)
        .post('/api/v1/orders')
        .send(orderBody)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /api/v1/orders', () => {
    let order1, order2;
    beforeEach(async () => {
      order1 = await Order.create({ userId: regularUser1.id, productId: product1.id, quantity: 1, totalPrice: product1.price });
      order2 = await Order.create({ userId: regularUser2.id, productId: product2.id, quantity: 2, totalPrice: product2.price * 2 });
    });

    it('should allow admin to get all orders', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.results).toBeInstanceOf(Array);
      expect(res.body.results.length).toBeGreaterThanOrEqual(2);
      expect(res.body.results.some(o => o.id === order1.id)).toBe(true);
      expect(res.body.results.some(o => o.id === order2.id)).toBe(true);
    });

    it('should allow regular user to get only their own orders', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${regular1AccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.results).toBeInstanceOf(Array);
      expect(res.body.results.length).toBe(1);
      expect(res.body.results[0].id).toBe(order1.id);
      expect(res.body.results[0].userId).toBe(regularUser1.id);
    });

    it('should return 401 if no authentication token is provided', async () => {
      await request(app)
        .get('/api/v1/orders')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /api/v1/orders/:orderId', () => {
    let order1;
    beforeEach(async () => {
      order1 = await Order.create({ userId: regularUser1.id, productId: product1.id, quantity: 1, totalPrice: product1.price });
    });

    it('should allow admin to get any order by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${order1.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.id).toBe(order1.id);
      expect(res.body.userId).toBe(regularUser1.id);
    });

    it('should allow a regular user to get their own order by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${order1.id}`)
        .set('Authorization', `Bearer ${regular1AccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.id).toBe(order1.id);
      expect(res.body.userId).toBe(regularUser1.id);
    });

    it('should not allow a regular user to get another user\'s order', async () => {
      await request(app)
        .get(`/api/v1/orders/${order1.id}`)
        .set('Authorization', `Bearer ${regular2AccessToken}`)
        .expect(httpStatus.FORBIDDEN);
    });

    it('should return 404 if order not found', async () => {
      await request(app)
        .get('/api/v1/orders/99999')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('PATCH /api/v1/orders/:orderId', () => {
    let order1;
    beforeEach(async () => {
      order1 = await Order.create({ userId: regularUser1.id, productId: product1.id, quantity: 2, totalPrice: product1.price * 2 });
    });

    it('should allow admin to update any order (e.g., status, quantity)', async () => {
      const updateBody = { status: 'completed', quantity: 3 };

      const res = await request(app)
        .patch(`/api/v1/orders/${order1.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.OK);

      expect(res.body.status).toBe(updateBody.status);
      expect(res.body.quantity).toBe(updateBody.quantity);
      expect(res.body.totalPrice).toBe((product1.price * updateBody.quantity).toFixed(2));

      const updatedProduct = await Product.findByPk(product1.id);
      // Original stock 100, order was 2, now 3. Stock should be 100-3 = 97
      expect(updatedProduct.stock).toBe(product1.stock - updateBody.quantity);
    });

    it('should allow a regular user to cancel their own pending order', async () => {
      const updateBody = { status: 'cancelled' };

      const res = await request(app)
        .patch(`/api/v1/orders/${order1.id}`)
        .set('Authorization', `Bearer ${regular1AccessToken}`)
        .send(updateBody)
        .expect(httpStatus.OK);

      expect(res.body.status).toBe(updateBody.status);
    });

    it('should not allow a regular user to update their own order to "completed"', async () => {
      const updateBody = { status: 'completed' };

      await request(app)
        .patch(`/api/v1/orders/${order1.id}`)
        .set('Authorization', `Bearer ${regular1AccessToken}`)
        .send(updateBody)
        .expect(httpStatus.FORBIDDEN);
    });

    it('should not allow a regular user to update quantity of their own order', async () => {
      const updateBody = { quantity: 5 };

      await request(app)
        .patch(`/api/v1/orders/${order1.id}`)
        .set('Authorization', `Bearer ${regular1AccessToken}`)
        .send(updateBody)
        .expect(httpStatus.FORBIDDEN);
    });

    it('should not allow a regular user to update another user\'s order', async () => {
      const updateBody = { status: 'cancelled' };

      await request(app)
        .patch(`/api/v1/orders/${order1.id}`)
        .set('Authorization', `Bearer ${regular2AccessToken}`)
        .send(updateBody)
        .expect(httpStatus.FORBIDDEN);
    });

    it('should return 404 if order not found for update', async () => {
      await request(app)
        .patch('/api/v1/orders/99999')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ status: 'completed' })
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('DELETE /api/v1/orders/:orderId', () => {
    let order1;
    beforeEach(async () => {
      order1 = await Order.create({ userId: regularUser1.id, productId: product1.id, quantity: 2, totalPrice: product1.price * 2 });
    });

    it('should allow admin to delete any order and restore stock', async () => {
      const initialStock = (await Product.findByPk(product1.id)).stock;

      await request(app)
        .delete(`/api/v1/orders/${order1.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NO_CONTENT);

      const dbOrder = await Order.findByPk(order1.id);
      expect(dbOrder).toBeNull();

      const updatedProduct = await Product.findByPk(product1.id);
      expect(updatedProduct.stock).toBe(initialStock + order1.quantity); // Stock should be restored
    });

    it('should not restore stock if order was completed/cancelled', async () => {
      const completedOrder = await Order.create({ userId: regularUser1.id, productId: product2.id, quantity: 1, totalPrice: product2.price, status: 'completed' });
      const initialStock = (await Product.findByPk(product2.id)).stock;

      await request(app)
        .delete(`/api/v1/orders/${completedOrder.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NO_CONTENT);

      const updatedProduct = await Product.findByPk(product2.id);
      expect(updatedProduct.stock).toBe(initialStock); // Stock should not be restored
    });


    it('should not allow a regular user to delete an order', async () => {
      await request(app)
        .delete(`/api/v1/orders/${order1.id}`)
        .set('Authorization', `Bearer ${regular1AccessToken}`)
        .expect(httpStatus.FORBIDDEN);
    });

    it('should return 404 if order not found for deletion', async () => {
      await request(app)
        .delete('/api/v1/orders/99999')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND);
    });
  });
});
```