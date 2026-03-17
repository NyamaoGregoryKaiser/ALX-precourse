```typescript
import { AppDataSource } from "../../config/database";
import { User } from "../../entities/User";
import { Project } from "../../entities/Project";
import { ScrapingTask } from "../../entities/ScrapingTask";
import { ScrapingResult } from "../../entities/ScrapingResult";
import * as bcrypt from "bcryptjs";
import { logger } from "../../utils/logger";

/**
 * @file Database seeding script for initial data population.
 *
 * This script connects to the database and inserts initial data
 * for users, projects, and scraping tasks, useful for development
 * and testing environments.
 */

const seed = async () => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info("Database connection for seeding initialized.");
    }

    const userRepository = AppDataSource.getRepository(User);
    const projectRepository = AppDataSource.getRepository(Project);
    const taskRepository = AppDataSource.getRepository(ScrapingTask);
    const resultRepository = AppDataSource.getRepository(ScrapingResult);

    // Clear existing data (optional, useful for clean re-seeding)
    logger.info("Clearing existing data...");
    await resultRepository.delete({});
    await taskRepository.delete({});
    await projectRepository.delete({});
    await userRepository.delete({});
    logger.info("Data cleared.");

    // Create users
    const adminUser = new User();
    adminUser.username = "admin";
    adminUser.email = "admin@example.com";
    adminUser.password = await bcrypt.hash("adminpassword", 10);
    adminUser.role = "admin";
    await userRepository.save(adminUser);
    logger.info(`Admin user created: ${adminUser.username}`);

    const regularUser = new User();
    regularUser.username = "testuser";
    regularUser.email = "user@example.com";
    regularUser.password = await bcrypt.hash("userpassword", 10);
    regularUser.role = "user";
    await userRepository.save(regularUser);
    logger.info(`Regular user created: ${regularUser.username}`);

    // Create projects
    const project1 = new Project();
    project1.name = "My First Project";
    project1.description = "A project to scrape product data.";
    project1.user = regularUser;
    await projectRepository.save(project1);
    logger.info(`Project created: ${project1.name} by ${regularUser.username}`);

    const project2 = new Project();
    project2.name = "News Scraper";
    project2.description = "Scraping headlines from news sites.";
    project2.user = adminUser;
    await projectRepository.save(project2);
    logger.info(`Project created: ${project2.name} by ${adminUser.username}`);

    // Create scraping tasks
    const task1 = new ScrapingTask();
    task1.project = project1;
    task1.targetUrl = "https://quotes.toscrape.com/";
    task1.selectors = [
      { name: "quote_text", selector: ".quote:nth-child(1) .text" },
      { name: "author", selector: ".quote:nth-child(1) .author" },
      { name: "tags", selector: ".quote:nth-child(1) .tag" }
    ];
    task1.status = "pending";
    task1.scheduleInterval = "daily";
    task1.headless = true;
    await taskRepository.save(task1);
    logger.info(`Scraping task created: ${task1.targetUrl} for project ${project1.name}`);

    const task2 = new ScrapingTask();
    task2.project = project1;
    task2.targetUrl = "http://books.toscrape.com/";
    task2.selectors = [
      { name: "book_title", selector: ".product_pod:nth-child(1) h3 a" },
      { name: "book_price", selector: ".product_pod:nth-child(1) .price_color" }
    ];
    task2.status = "pending";
    task2.scheduleInterval = "weekly";
    task2.headless = false; // Example of non-headless
    await taskRepository.save(task2);
    logger.info(`Scraping task created: ${task2.targetUrl} for project ${project1.name}`);

    logger.info("Seeding completed successfully!");
  } catch (error) {
    logger.error("Error during seeding:", error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info("Database connection for seeding closed.");
    }
  }
};

seed();
```