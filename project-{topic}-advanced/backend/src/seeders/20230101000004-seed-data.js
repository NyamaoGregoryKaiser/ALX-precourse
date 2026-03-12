'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash('password123', 10);

    const adminUserId = uuidv4();
    const regularUserId = uuidv4();
    const otherUserId = uuidv4();

    await queryInterface.bulkInsert('users', [
      {
        id: adminUserId,
        username: 'adminuser',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: regularUserId,
        username: 'testuser',
        email: 'user@example.com',
        password: hashedPassword,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: otherUserId,
        username: 'johndoe',
        email: 'john@example.com',
        password: hashedPassword,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});

    const project1Id = uuidv4();
    const project2Id = uuidv4();

    await queryInterface.bulkInsert('projects', [
      {
        id: project1Id,
        name: 'Website Redesign',
        description: 'Redesign the company website for better UX and modern aesthetics.',
        status: 'active',
        ownerId: adminUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: project2Id,
        name: 'Mobile App Development',
        description: 'Develop a new mobile application for iOS and Android.',
        status: 'in-progress',
        ownerId: regularUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});

    await queryInterface.bulkInsert('tasks', [
      {
        id: uuidv4(),
        title: 'Design homepage layout',
        description: 'Create wireframes and mockups for the new homepage.',
        status: 'in-progress',
        priority: 'high',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 7)), // 7 days from now
        projectId: project1Id,
        assignedTo: regularUserId,
        creatorId: adminUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        title: 'Develop user authentication module',
        description: 'Implement login, registration, and password reset functionalities.',
        status: 'to-do',
        priority: 'high',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 14)), // 14 days from now
        projectId: project2Id,
        assignedTo: adminUserId,
        creatorId: regularUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        title: 'Set up database schema',
        description: 'Define tables, relationships, and initial data for the backend.',
        status: 'done',
        priority: 'medium',
        dueDate: new Date(new Date().setDate(new Date().getDate() - 3)), // 3 days ago
        projectId: project1Id,
        assignedTo: adminUserId,
        creatorId: adminUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        title: 'Implement task list component',
        description: 'Frontend component for displaying and filtering tasks.',
        status: 'in-progress',
        priority: 'medium',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 10)),
        projectId: project2Id,
        assignedTo: regularUserId,
        creatorId: regularUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        title: 'Write API documentation',
        description: 'Document all API endpoints with examples.',
        status: 'to-do',
        priority: 'low',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 20)),
        projectId: project1Id,
        assignedTo: otherUserId,
        creatorId: adminUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('tasks', null, {});
    await queryInterface.bulkDelete('projects', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};