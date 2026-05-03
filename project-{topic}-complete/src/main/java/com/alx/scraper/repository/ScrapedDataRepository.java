package com.alx.scraper.repository;

import com.alx.scraper.entity.ScrapedData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScrapedDataRepository extends JpaRepository<ScrapedData, Long> {
    List<ScrapedData> findByScrapingJobId(Long jobId);
}