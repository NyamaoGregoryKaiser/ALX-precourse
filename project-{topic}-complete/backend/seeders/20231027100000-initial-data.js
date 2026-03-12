'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const adminUserId = uuidv4();
    const normalUserId = uuidv4();
    const timestamp = new Date();

    await queryInterface.bulkInsert('users', [
      {
        id: adminUserId,
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: normalUserId,
        username: 'john_doe',
        email: 'john.doe@example.com',
        password: hashedPassword,
        role: 'user',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ], {});

    const dataSourceId1 = uuidv4();
    await queryInterface.bulkInsert('data_sources', [
      {
        id: dataSourceId1,
        userId: adminUserId,
        name: 'Sample Sales Data',
        type: 'json_data',
        config: { description: 'Fictional sales data for demonstration' },
        schema: [
          { name: 'product', type: 'string' },
          { name: 'category', type: 'string' },
          { name: 'sales', type: 'number' },
          { name: 'units', type: 'number' },
          { name: 'date', type: 'date' },
        ],
        data: [
          { product: 'Laptop', category: 'Electronics', sales: 1200, units: 10, date: '2023-01-15' },
          { product: 'Mouse', category: 'Electronics', sales: 50, units: 20, date: '2023-01-15' },
          { product: 'Keyboard', category: 'Electronics', sales: 100, units: 15, date: '2023-01-16' },
          { product: 'Shirt', category: 'Apparel', sales: 30, units: 50, date: '2023-01-16' },
          { product: 'Pants', category: 'Apparel', sales: 60, units: 30, date: '2023-01-17' },
          { product: 'Monitor', category: 'Electronics', sales: 300, units: 5, date: '2023-01-17' },
        ],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: uuidv4(),
        userId: normalUserId,
        name: 'User Specific Data',
        type: 'json_data',
        config: { description: 'Data uploaded by John Doe' },
        schema: [
          { name: 'item', type: 'string' },
          { name: 'quantity', type: 'number' },
        ],
        data: [
          { item: 'Apple', quantity: 100 },
          { item: 'Orange', quantity: 150 },
        ],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ], {});

    const visId1 = uuidv4();
    const visId2 = uuidv4();

    await queryInterface.bulkInsert('visualizations', [
      {
        id: visId1,
        userId: adminUserId,
        dataSourceId: dataSourceId1,
        name: 'Sales by Category Bar Chart',
        type: 'bar',
        config: {
          title: 'Total Sales by Product Category',
          xAxis: 'category',
          yAxis: 'total_sales',
          colorField: 'category',
        },
        filters: [],
        groupBy: 'category',
        aggregates: [{ field: 'sales', operation: 'sum', alias: 'total_sales' }],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: visId2,
        userId: adminUserId,
        dataSourceId: dataSourceId1,
        name: 'Units Sold Over Time Line Chart',
        type: 'line',
        config: {
          title: 'Units Sold Over Time',
          xAxis: 'date',
          yAxis: 'total_units',
        },
        filters: [],
        groupBy: 'date',
        aggregates: [{ field: 'units', operation: 'sum', alias: 'total_units' }],
        createdAt: timestamp,
        updatedAt: timestamp,
      }
    ], {});

    await queryInterface.bulkInsert('dashboards', [
      {
        id: uuidv4(),
        userId: adminUserId,
        name: 'Admin Sales Dashboard',
        description: 'Overview of sample sales data for administrators.',
        layout: [
          { i: visId1, x: 0, y: 0, w: 6, h: 4 },
          { i: visId2, x: 6, y: 0, w: 6, h: 4 },
        ],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ], {});

  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('dashboards', null, {});
    await queryInterface.bulkDelete('visualizations', null, {});
    await queryInterface.bulkDelete('data_sources', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};