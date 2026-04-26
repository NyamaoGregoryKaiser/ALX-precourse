package com.alx.scraper.repository;

import com.alx.scraper.model.ScrapingJob;
import com.alx.scraper.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for {@link ScrapingJob} entities.
 * Provides data access operations for managing scraping jobs.
 *
 * ALX Focus: Further demonstrates Spring Data JPA. Includes methods to find jobs
 * by user, by status, and to find a specific job for a specific user, enforcing
 * authorization at the data access layer.
 */
@Repository
public interface ScrapingJobRepository extends JpaRepository<ScrapingJob, Long> {

    /**
     * Finds all scraping jobs belonging to a specific user.
     *
     * @param user The user whose jobs are to be retrieved.
     * @return A list of {@link ScrapingJob} associated with the user.
     */
    List<ScrapingJob> findByUser(User user);

    /**
     * Finds a scraping job by its ID and the user who owns it.
     * This is important for ensuring a user can only access their own jobs.
     *
     * @param id The ID of the scraping job.
     * @param user The user who owns the job.
     * @return An {@link Optional} containing the found job, or empty if not found or not owned by the user.
     */
    Optional<ScrapingJob> findByIdAndUser(Long id, User user);

    /**
     * Finds all active scraping jobs (e.g., those scheduled to run).
     *
     * @param status The status to filter by (e.g., ScrapingJob.JobStatus.ACTIVE).
     * @return A list of {@link ScrapingJob} with the given status.
     */
    List<ScrapingJob> findByStatus(ScrapingJob.JobStatus status);
}