'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('password123', 10);

    const adminUserId = uuidv4();
    const userUserId = uuidv4();

    await queryInterface.bulkInsert('Users', [
      {
        id: adminUserId,
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: userUserId,
        name: 'Regular User',
        email: 'user@example.com',
        password: hashedPassword,
        role: 'user',
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});

    const project1Id = uuidv4();
    const project2Id = uuidv4();

    await queryInterface.bulkInsert('Projects', [
      {
        id: project1Id,
        name: 'PMApi Backend Development',
        description: 'Develop the robust backend API for the Project Management System.',
        status: 'in-progress',
        createdBy: adminUserId,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 2)),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: project2Id,
        name: 'PMApi Frontend Implementation',
        description: 'Build the intuitive user interface for the Project Management System.',
        status: 'pending',
        createdBy: userUserId,
        startDate: new Date(new Date().setDate(new Date().getDate() + 7)),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});

    await queryInterface.bulkInsert('Tasks', [
      {
        id: uuidv4(),
        title: 'Implement User Authentication',
        description: 'Set up JWT-based authentication for user login and registration.',
        status: 'in-progress',
        priority: 'high',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 10)),
        projectId: project1Id,
        assignedTo: adminUserId,
        createdBy: adminUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        title: 'Database Schema Design',
        description: 'Define models and relationships for Users, Projects, and Tasks.',
        status: 'done',
        priority: 'high',
        dueDate: new Date(new Date().setDate(new Date().getDate() - 5)),
        projectId: project1Id,
        assignedTo: adminUserId,
        createdBy: adminUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        title: 'Develop Project CRUD Endpoints',
        description: 'Create API endpoints for creating, reading, updating, and deleting projects.',
        status: 'todo',
        priority: 'medium',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 15)),
        projectId: project1Id,
        assignedTo: adminUserId,
        createdBy: adminUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        title: 'Design Project Dashboard UI',
        description: 'Create wireframes and mockups for the main project dashboard.',
        status: 'todo',
        priority: 'medium',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 20)),
        projectId: project2Id,
        assignedTo: userUserId,
        createdBy: userUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Tasks', null, {});
    await queryInterface.bulkDelete('Projects', null, {});
    await queryInterface.bulkDelete('Users', null, {});
  },
};