```java
package com.alx.webscraper.repository;

import com.alx.webscraper.model.ScrapedData;
import com.alx.webscraper.model.ScrapingTask;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository interface for managing ScrapedData entities.
 * Extends JpaRepository for basic CRUD and pagination operations.
 */
@Repository
public interface ScrapedDataRepository extends JpaRepository<ScrapedData, UUID> {

    /**
     * Finds all scraped data entries associated with a specific scraping task.
     * @param scrapingTask The scraping task entity.
     * @return A list of ScrapedData entities.
     */
    List<ScrapedData> findByScrapingTask(ScrapingTask scrapingTask);

    /**
     * Finds all scraped data entries associated with a specific scraping task, with pagination.
     * @param scrapingTask The scraping task entity.
     * @param pageable Pagination information.
     * @return A page of ScrapedData entities.
     */
    Page<ScrapedData> findByScrapingTask(ScrapingTask scrapingTask, Pageable pageable);

    /**
     * Deletes all scraped data entries associated with a specific scraping task.
     * @param scrapingTask The scraping task entity.
     * @return The number of records deleted.
     */
    long deleteByScrapingTask(ScrapingTask scrapingTask);
}
```