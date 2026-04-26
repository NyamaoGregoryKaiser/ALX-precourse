package com.alx.scraper.repository;

import com.alx.scraper.model.ScrapedData;
import com.alx.scraper.model.ScrapingJob;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository interface for {@link ScrapedData} entities.
 * Provides data access operations for managing scraped data entries.
 *
 * ALX Focus: Demonstrates how to fetch related data (e.g., data for a specific job)
 * and how to implement pagination using Spring Data JPA's {@link Pageable} interface,
 * which is crucial for handling potentially large datasets in an enterprise application.
 */
@Repository
public interface ScrapedDataRepository extends JpaRepository<ScrapedData, Long> {

    /**
     * Finds all scraped data entries for a given scraping job, with pagination.
     * This is essential for efficiently retrieving potentially large amounts of scraped data.
     *
     * @param scrapingJob The {@link ScrapingJob} to retrieve data for.
     * @param pageable The pagination information (page number, size, sort).
     * @return A {@link Page} of {@link ScrapedData} entries for the specified job.
     */
    Page<ScrapedData> findByScrapingJob(ScrapingJob scrapingJob, Pageable pageable);

    /**
     * Deletes all scraped data entries associated with a specific scraping job.
     *
     * @param scrapingJob The {@link ScrapingJob} whose data is to be deleted.
     */
    void deleteAllByScrapingJob(ScrapingJob scrapingJob);
}