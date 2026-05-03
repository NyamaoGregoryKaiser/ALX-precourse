package com.alx.scrapingtools.scraper.repository;

import com.alx.scrapingtools.scraper.model.ScrapedDataItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ScrapedDataItemRepository extends JpaRepository<ScrapedDataItem, UUID> {
    List<ScrapedDataItem> findByScrapingJobId(UUID scrapingJobId);
    List<ScrapedDataItem> findByScraperConfigId(UUID scraperConfigId);
    void deleteByScraperConfigId(UUID scraperConfigId);
}