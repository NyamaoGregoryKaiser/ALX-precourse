'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const adminHashedPassword = await bcrypt.hash('AdminPass456!', 10);

    const userId1 = uuidv4();
    const userId2 = uuidv4();
    const adminId = uuidv4();

    await queryInterface.bulkInsert('Users', [
      {
        id: userId1,
        username: 'testuser',
        email: 'user@example.com',
        passwordHash: hashedPassword,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: userId2,
        username: 'anotheruser',
        email: 'another@example.com',
        passwordHash: hashedPassword,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: adminId,
        username: 'adminuser',
        email: 'admin@example.com',
        passwordHash: adminHashedPassword,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});

    const projectId1 = uuidv4();
    const projectId2 = uuidv4();
    const projectId3 = uuidv4();

    await queryInterface.bulkInsert('Projects', [
      {
        id: projectId1,
        name: 'Data Preprocessing Experiments',
        description: 'A project to test various data cleaning and transformation techniques.',
        userId: userId1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: projectId2,
        name: 'Model Evaluation Sandbox',
        description: 'Testing different metrics for classification and regression models.',
        userId: userId1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: projectId3,
        name: 'Admin Project',
        description: 'Project managed by an admin user.',
        userId: adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});

    await queryInterface.bulkInsert('MLTasks', [
      {
        id: uuidv4(),
        projectId: projectId1,
        type: 'min_max_scaling',
        inputData: { data: [{ age: 20 }, { age: 30 }, { age: 40 }] },
        parameters: { column: 'age' },
        outputData: { scaled_data: [{ age: 0 }, { age: 0.5 }, { age: 1 }] },
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        projectId: projectId1,
        type: 'one_hot_encoding',
        inputData: { data: [{ city: 'NY' }, { city: 'LA' }, { city: 'NY' }] },
        parameters: { column: 'city' },
        outputData: { encoded_data: [{ NY: 1, LA: 0 }, { NY: 0, LA: 1 }, { NY: 1, LA: 0 }] },
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        projectId: projectId2,
        type: 'accuracy_score',
        inputData: { y_true: [0, 1, 0, 1], y_pred: [0, 1, 1, 1] },
        parameters: {},
        outputData: { score: 0.75 },
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        projectId: projectId3,
        type: 'mse',
        inputData: { y_true: [10, 20, 30], y_pred: [11, 19, 32] },
        parameters: {},
        outputData: { score: 2 },
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('MLTasks', null, {});
    await queryInterface.bulkDelete('Projects', null, {});
    await queryInterface.bulkDelete('Users', null, {});
  }
};