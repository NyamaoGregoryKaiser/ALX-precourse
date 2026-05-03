package com.alx.scrapingtools.scraper.repository;

import com.alx.scrapingtools.scraper.model.ScraperConfig;
import com.alx.scrapingtools.scraper.model.ScrapingJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ScrapingJobRepository extends JpaRepository<ScrapingJob, UUID> {
    List<ScrapingJob> findByScraperConfig(ScraperConfig config);
    List<ScrapingJob> findByScraperConfigIdOrderByStartTimeDesc(UUID scraperConfigId);
    List<ScrapingJob> findByStatus(String status);
}