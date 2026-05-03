package com.alx.scraper.repository;

import com.alx.scraper.entity.ScrapingJob;
import com.alx.scraper.entity.ScrapingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScrapingJobRepository extends JpaRepository<ScrapingJob, Long> {
    List<ScrapingJob> findByUserId(Long userId);
    List<ScrapingJob> findByStatus(ScrapingStatus status);
}