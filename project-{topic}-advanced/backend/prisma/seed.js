const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { saltRounds } = require('../src/config/auth');
const { logger } = require('../src/config/logger');

const prisma = new PrismaClient();

async function main() {
  logger.info('Seeding database...');

  // Create Admin User
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const hashedPasswordAdmin = await bcrypt.hash(adminPassword, saltRounds);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: hashedPasswordAdmin,
      role: 'ADMIN',
    },
  });
  logger.info(`Created/Updated Admin User: ${adminUser.username} (${adminUser.email})`);

  // Create Regular User
  const userPassword = process.env.USER_PASSWORD || 'User@123';
  const hashedPasswordUser = await bcrypt.hash(userPassword, saltRounds);

  const regularUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      username: 'testuser',
      email: 'user@example.com',
      passwordHash: hashedPasswordUser,
      role: 'USER',
    },
  });
  logger.info(`Created/Updated Regular User: ${regularUser.username} (${regularUser.email})`);

  // Example Scrape Jobs (only PENDING jobs will be processed by the queue on startup)
  // Ensure the URLs are publicly accessible and consent to scraping
  const exampleJobs = [
    {
      userId: regularUser.id,
      url: 'https://www.scrapethissite.com/pages/simple/', // Example: static page
      targetElements: [
        { name: 'countryName', selector: '.country-name', type: 'text' },
        { name: 'countryCapital', selector: '.country-capital', type: 'text' },
      ],
      status: 'PENDING',
    },
    {
      userId: regularUser.id,
      url: 'https://books.toscrape.com/', // Example: dynamic content, though this is mostly static
      targetElements: [
        { name: 'productTitles', selector: 'article.product_pod h3 a', type: 'attribute', attribute: 'title' },
        { name: 'productPrices', selector: '.product_pod .price_color', type: 'text' },
      ],
      status: 'PENDING',
    },
    {
      userId: adminUser.id,
      url: 'https://quotes.toscrape.com/', // Another example
      targetElements: [
        { name: 'quoteText', selector: '.quote .text', type: 'text' },
        { name: 'author', selector: '.quote .author', type: 'text' },
      ],
      status: 'PENDING',
    },
    {
      userId: regularUser.id,
      url: 'https://example.com', // A simple completed job
      targetElements: [{ name: 'pageTitle', selector: 'h1', type: 'text' }],
      status: 'COMPLETED',
      startTime: new Date(Date.now() - 3600000), // 1 hour ago
      endTime: new Date(Date.now() - 3500000), // 1 hour ago + 100s
    },
  ];

  for (const jobData of exampleJobs) {
    // Check if a job with the same URL and target elements already exists for this user (basic uniqueness)
    const existingJob = await prisma.scrapeJob.findFirst({
      where: {
        userId: jobData.userId,
        url: jobData.url,
        // Prisma cannot directly compare Json fields for equality in 'where' clause.
        // A full comparison would require more complex logic or hashing of targetElements.
        // For seeding, we'll just check URL and user.
      },
    });

    if (!existingJob) {
      const job = await prisma.scrapeJob.create({ data: jobData });
      logger.info(`Created Scrape Job: ${job.url} with status ${job.status}`);

      // If job is completed, also create a dummy result
      if (job.status === 'COMPLETED') {
        await prisma.scrapeResult.create({
          data: {
            jobId: job.id,
            data: { title: 'Example Domain', text: 'This domain is for use in illustrative examples in documents.' },
            extractedAt: job.endTime,
          },
        });
        logger.info(`Created dummy result for completed job ${job.id}`);
      }
    } else {
      logger.info(`Scrape job for ${jobData.url} already exists for user ${jobData.userId}. Skipping.`);
    }
  }

  logger.info('Database seeding complete.');
}

main()
  .catch((e) => {
    logger.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });