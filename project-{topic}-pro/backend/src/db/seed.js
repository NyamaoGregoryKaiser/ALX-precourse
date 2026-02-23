```javascript
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs'); // For manual password hashing in seed
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const logger = require('../utils/logger');

dotenv.config({ path: './.env' }); // Load .env for mongoURI

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/task_manager_db';

const seedDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    logger.info('MongoDB connected for seeding...');

    // Clear existing data
    await User.deleteMany();
    await Project.deleteMany();
    await Task.deleteMany();
    logger.info('Existing data cleared.');

    // Create Users
    const hashedPassword = await bcrypt.hash('password123', 10);
    const users = await User.create([
      { username: 'adminuser', email: 'admin@example.com', password: hashedPassword, role: 'admin' },
      { username: 'manageruser', email: 'manager@example.com', password: hashedPassword, role: 'manager' },
      { username: 'devuser1', email: 'dev1@example.com', password: hashedPassword, role: 'developer' },
      { username: 'devuser2', email: 'dev2@example.com', password: hashedPassword, role: 'developer' },
    ]);

    const adminUser = users.find(u => u.role === 'admin');
    const managerUser = users.find(u => u.role === 'manager');
    const devUser1 = users.find(u => u.username === 'devuser1');
    const devUser2 = users.find(u => u.username === 'devuser2');

    logger.info(`${users.length} users created.`);

    // Create Projects
    const projects = await Project.create([
      {
        name: 'Website Redesign',
        description: 'Redesign the company\'s main website for better UX/UI.',
        owner: managerUser._id,
        members: [
          { user: managerUser._id, role: 'manager' },
          { user: devUser1._id, role: 'developer' },
        ],
        status: 'active',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-06-30'),
      },
      {
        name: 'Mobile App Development',
        description: 'Develop a new mobile application for iOS and Android.',
        owner: managerUser._id,
        members: [
          { user: managerUser._id, role: 'manager' },
          { user: devUser1._id, role: 'developer' },
          { user: devUser2._id, role: 'developer' },
        ],
        status: 'in-progress',
        startDate: new Date('2023-03-15'),
        endDate: new Date('2023-12-31'),
      },
      {
        name: 'Internal Tools Optimization',
        description: 'Improve and optimize internal tools for increased productivity.',
        owner: adminUser._id,
        members: [
          { user: adminUser._id, role: 'manager' },
          { user: devUser2._id, role: 'developer' },
        ],
        status: 'active',
        startDate: new Date('2024-01-10'),
      },
    ]);

    const project1 = projects[0];
    const project2 = projects[1];
    const project3 = projects[2];

    logger.info(`${projects.length} projects created.`);

    // Create Tasks
    await Task.create([
      // Tasks for Project 1 (Website Redesign)
      {
        title: 'Design Home Page Layout',
        description: 'Create wireframes and mockups for the new homepage layout.',
        projectId: project1._id,
        assignedTo: devUser1._id,
        status: 'In Progress',
        priority: 'High',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
      {
        title: 'Develop User Authentication Module',
        description: 'Implement secure user registration and login functionality.',
        projectId: project1._id,
        assignedTo: devUser1._id,
        status: 'To Do',
        priority: 'High',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      },
      {
        title: 'Setup Database Schema',
        description: 'Define and implement MongoDB schemas for users, projects, and tasks.',
        projectId: project1._id,
        assignedTo: devUser1._id,
        status: 'Done',
        priority: 'High',
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      // Tasks for Project 2 (Mobile App Development)
      {
        title: 'Research UI Frameworks',
        description: 'Investigate React Native vs Flutter for frontend development.',
        projectId: project2._id,
        assignedTo: devUser2._id,
        status: 'In Progress',
        priority: 'Medium',
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'API Integration for Task Management',
        description: 'Integrate mobile app with existing task management backend API.',
        projectId: project2._id,
        assignedTo: devUser1._id,
        status: 'To Do',
        priority: 'High',
        dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      },
      // Tasks for Project 3 (Internal Tools Optimization)
      {
        title: 'Refactor Reporting Module',
        description: 'Refactor old reporting module code for better performance and readability.',
        projectId: project3._id,
        assignedTo: devUser2._id,
        status: 'Blocked',
        priority: 'Urgent',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Automate Deployment Script',
        description: 'Create a new script to automate the deployment process for internal tools.',
        projectId: project3._id,
        assignedTo: devUser2._id,
        status: 'To Do',
        priority: 'High',
        dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      },
    ]);

    logger.info(`${(await Task.countDocuments())} tasks created.`);

    logger.info('Database seeded successfully!');
  } catch (err) {
    logger.error(`Error seeding database: ${err.message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected.');
    process.exit(0);
  }
};

// Check if this script is run directly
if (require.main === module) {
  seedDB();
} else {
  // Export if required by other modules (e.g., for testing)
  module.exports = seedDB;
}
```