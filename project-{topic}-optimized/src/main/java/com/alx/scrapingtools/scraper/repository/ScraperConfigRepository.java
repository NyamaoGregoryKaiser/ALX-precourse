package com.alx.scrapingtools.scraper.repository;

import com.alx.scrapingtools.scraper.model.ScraperConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ScraperConfigRepository extends JpaRepository<ScraperConfig, UUID> {
    Optional<ScraperConfig> findByName(String name);
    List<ScraperConfig> findByIsActiveTrue();
    List<ScraperConfig> findByIsActiveTrueAndLastRunTimeBefore(OffsetDateTime dateTime);
    List<ScraperConfig> findByCreatedById(UUID userId);
}