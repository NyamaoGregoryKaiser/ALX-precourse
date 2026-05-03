package com.alx.scrapingtools.scraper.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "scraped_data_items")
public class ScrapedDataItem {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scraping_job_id", nullable = false)
    private ScrapingJob scrapingJob;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scraper_config_id", nullable = false)
    private ScraperConfig scraperConfig;

    @Column(columnDefinition = "TEXT")
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String url;

    @Column(columnDefinition = "TEXT")
    private String content; // General purpose content

    @Column(name = "scraped_at", nullable = false)
    private OffsetDateTime scrapedAt;

    @PrePersist
    protected void onCreate() {
        scrapedAt = OffsetDateTime.now();
    }
}