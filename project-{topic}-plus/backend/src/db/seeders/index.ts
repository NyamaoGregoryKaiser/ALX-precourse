import { AppDataSource } from '../data-source';
import { User, UserRole } from '../../entities/User';
import * as bcrypt from 'bcryptjs';
import { Scraper } from '../../entities/Scraper';
import { ScrapeJobStatus } from '../../entities/ScrapeJob';
import { resolve } from 'path';
import * as dotenv from 'dotenv';
import { LoggerService } from '../../utils/logger';

dotenv.config({ path: resolve(__dirname, '../../../.env') }); // Adjust path for seeder execution

const logger = LoggerService.getLogger();

export const seedDatabase = async () => {
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
            logger.info("Data Source initialized for seeding.");
        }

        // Check if data already exists to prevent duplication
        const existingUsers = await AppDataSource.getRepository(User).count();
        if (existingUsers > 0) {
            logger.info("Database already seeded. Skipping.");
            return;
        }

        logger.info("Starting database seeding...");

        // 1. Create Users
        const adminUser = new User();
        adminUser.username = "admin";
        adminUser.email = "admin@example.com";
        adminUser.password_hash = await bcrypt.hash("adminpassword", 10);
        adminUser.role = UserRole.ADMIN;
        await AppDataSource.getRepository(User).save(adminUser);
        logger.info("Admin user created.");

        const regularUser = new User();
        regularUser.username = "user";
        regularUser.email = "user@example.com";
        regularUser.password_hash = await bcrypt.hash("userpassword", 10);
        regularUser.role = UserRole.USER;
        await AppDataSource.getRepository(User).save(regularUser);
        logger.info("Regular user created.");

        // 2. Create Scrapers
        const exampleScraper = new Scraper();
        exampleScraper.name = "Example Product Scraper";
        exampleScraper.description = "Scrapes product names and prices from an e-commerce site.";
        exampleScraper.start_url = "https://quotes.toscrape.com/"; // Using a public test site
        exampleScraper.selectors_config = {
            items: ".quote",
            fields: {
                text: ".text",
                author: ".author",
                tags: ".tag"
            }
        };
        exampleScraper.pagination_config = {
            nextButton: ".next a"
        };
        exampleScraper.user = adminUser;
        await AppDataSource.getRepository(Scraper).save(exampleScraper);
        logger.info("Example Scraper created.");

        const anotherScraper = new Scraper();
        anotherScraper.name = "Simple Blog Post Scraper";
        anotherScraper.description = "Scrapes titles and links from a simple blog index.";
        anotherScraper.start_url = "https://blog.scrapinghub.com/";
        anotherScraper.selectors_config = {
            items: "article.post",
            fields: {
                title: "h2 a::text",
                link: "h2 a::attr(href)"
            }
        };
        anotherScraper.pagination_config = null; // No pagination for this example
        anotherScraper.user = regularUser;
        await AppDataSource.getRepository(Scraper).save(anotherScraper);
        logger.info("Another Scraper created.");

        // 3. Create initial Scrape Jobs (optional, typically jobs are created via API)
        // For demonstration, let's create a completed job
        const completedJob = AppDataSource.getRepository(ScrapeJob).create({
            scraper: exampleScraper,
            user: adminUser,
            status: ScrapeJobStatus.COMPLETED,
            started_at: new Date(Date.now() - 3600 * 1000), // 1 hour ago
            completed_at: new Date(Date.now() - 3000 * 1000), // 50 mins ago
            extracted_count: 10,
            log: "Successfully scraped 10 items from quotes.toscrape.com"
        });
        await AppDataSource.getRepository(ScrapeJob).save(completedJob);
        logger.info("Completed Scrape Job created.");

        logger.info("Database seeding completed successfully!");

    } catch (error) {
        logger.error("Error seeding database:", error);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
            logger.info("Data Source destroyed after seeding.");
        }
    }
};

// Execute the seeder when run directly
if (require.main === module) {
    seedDatabase();
}