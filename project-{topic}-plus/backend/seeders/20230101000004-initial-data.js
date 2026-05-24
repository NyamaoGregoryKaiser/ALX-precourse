```javascript
'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Hash passwords
    const adminPassword = await bcrypt.hash('Admin@123', 10);
    const editorPassword = await bcrypt.hash('Editor@123', 10);
    const viewerPassword = await bcrypt.hash('Viewer@123', 10);

    // Create users
    const adminId = uuidv4();
    const editorId = uuidv4();
    const viewerId = uuidv4();

    await queryInterface.bulkInsert('users', [
      {
        id: adminId,
        username: 'admin',
        email: 'admin@example.com',
        password: adminPassword,
        role: 'admin',
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: editorId,
        username: 'editor',
        email: 'editor@example.com',
        password: editorPassword,
        role: 'editor',
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: viewerId,
        username: 'viewer',
        email: 'viewer@example.com',
        password: viewerPassword,
        role: 'viewer',
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});

    // Create categories
    const techCategoryId = uuidv4();
    const travelCategoryId = uuidv4();
    const foodCategoryId = uuidv4();

    await queryInterface.bulkInsert('categories', [
      {
        id: techCategoryId,
        name: 'Technology',
        slug: 'technology',
        description: 'Latest in tech news and gadgets.',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: travelCategoryId,
        name: 'Travel',
        slug: 'travel',
        description: 'Explore the world with our travel guides.',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: foodCategoryId,
        name: 'Food & Cooking',
        slug: 'food-cooking',
        description: 'Delicious recipes and culinary tips.',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});

    // Create posts
    await queryInterface.bulkInsert('posts', [
      {
        id: uuidv4(),
        title: 'The Future of AI in Content Creation',
        slug: 'future-of-ai-content-creation',
        content: 'Artificial intelligence is rapidly transforming the landscape of content creation...',
        excerpt: 'Exploring how AI tools are impacting writing, design, and multimedia production.',
        status: 'published',
        publishedAt: new Date(),
        featuredImage: 'https://example.com/ai-image.jpg',
        authorId: editorId,
        categoryId: techCategoryId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        title: 'Top 10 Destinations for Solo Travelers',
        slug: 'top-10-solo-travel-destinations',
        content: 'Traveling solo can be an incredibly rewarding experience. Here are our top picks...',
        excerpt: 'A guide to safe and exciting destinations for your next solo adventure.',
        status: 'published',
        publishedAt: new Date(),
        featuredImage: 'https://example.com/travel-image.jpg',
        authorId: editorId,
        categoryId: travelCategoryId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        title: 'A Beginners Guide to Baking Sourdough',
        slug: 'beginners-guide-sourdough',
        content: 'Sourdough baking can seem daunting, but with these steps, you\'ll be a pro in no time.',
        excerpt: 'Simple instructions for making your first delicious loaf of sourdough bread.',
        status: 'published',
        publishedAt: new Date(),
        featuredImage: 'https://example.com/sourdough-image.jpg',
        authorId: editorId,
        categoryId: foodCategoryId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        title: 'Draft Post: Upcoming Tech Gadgets',
        slug: 'upcoming-tech-gadgets',
        content: 'A sneak peek into the most anticipated tech releases of the year...',
        excerpt: 'Early look at new smartphones, smart home devices, and wearables.',
        status: 'draft',
        publishedAt: null,
        featuredImage: null,
        authorId: editorId,
        categoryId: techCategoryId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('posts', null, {});
    await queryInterface.bulkDelete('categories', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};
```