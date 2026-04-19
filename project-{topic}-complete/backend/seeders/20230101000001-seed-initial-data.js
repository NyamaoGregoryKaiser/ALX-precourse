'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword1 = await bcrypt.hash('password123', 10);
    const hashedPassword2 = await bcrypt.hash('password456', 10);

    const user1Id = uuidv4();
    const user2Id = uuidv4();

    await queryInterface.bulkInsert('Users', [
      {
        id: user1Id,
        username: 'alice_admin',
        email: 'alice@example.com',
        password: hashedPassword1,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: user2Id,
        username: 'bob_user',
        email: 'bob@example.com',
        password: hashedPassword2,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});

    const project1Id = uuidv4();
    const project2Id = uuidv4();

    await queryInterface.bulkInsert('Projects', [
      {
        id: project1Id,
        name: 'Website Redesign',
        description: 'Redesign the company website with a modern look and improved UX.',
        status: 'active',
        ownerId: user1Id,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: project2Id,
        name: 'Mobile App Development',
        description: 'Develop a new mobile application for iOS and Android.',
        status: 'in-progress',
        ownerId: user2Id,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 6)),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});

    await queryInterface.bulkInsert('Tasks', [
      {
        id: uuidv4(),
        title: 'Design UI/UX for Home Page',
        description: 'Create wireframes and mockups for the new homepage layout.',
        status: 'in-progress',
        priority: 'high',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 7)),
        projectId: project1Id,
        assignedToId: user1Id,
        createdBy: user1Id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        title: 'Develop User Authentication',
        description: 'Implement JWT-based authentication for the backend API.',
        status: 'pending',
        priority: 'urgent',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 10)),
        projectId: project2Id,
        assignedToId: user2Id,
        createdBy: user1Id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        title: 'Setup Database Schema',
        description: 'Define and implement initial database schema for users, projects, and tasks.',
        status: 'completed',
        priority: 'high',
        dueDate: new Date(new Date().setDate(new Date().getDate() - 5)),
        projectId: project2Id,
        assignedToId: user2Id,
        createdBy: user1Id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Tasks', null, {});
    await queryInterface.bulkDelete('Projects', null, {});
    await queryInterface.bulkDelete('Users', null, {});
  }
};