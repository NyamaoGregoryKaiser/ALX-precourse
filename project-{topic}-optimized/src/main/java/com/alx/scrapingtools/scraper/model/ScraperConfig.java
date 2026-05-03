package com.alx.scrapingtools.scraper.model;

import com.alx.scrapingtools.user.model.User;
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
@Table(name = "scraper_configs")
public class ScraperConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "start_url", nullable = false, length = 1024)
    private String startUrl;

    @Column(name = "css_selector_target", nullable = false, length = 255)
    private String cssSelectorTarget; // CSS selector for the main items to scrape (e.g., ".news-article")

    @Column(name = "css_selector_title", length = 255)
    private String cssSelectorTitle; // CSS selector for title within each target item (e.g., "h2 a")

    @Column(name = "css_selector_description", length = 255)
    private String cssSelectorDescription; // CSS selector for description (e.g., "p.summary")

    @Column(name = "css_selector_link", length = 255)
    private String cssSelectorLink; // CSS selector for link (e.g., "a", or attribute "href")

    @Column(name = "scrape_interval_minutes")
    private Integer scrapeIntervalMinutes; // How often to run, in minutes

    @Column(name = "last_run_time")
    private OffsetDateTime lastRunTime;

    @Column(name = "is_active")
    private Boolean isActive;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
        if (isActive == null) isActive = true;
        if (scrapeIntervalMinutes == null) scrapeIntervalMinutes = 60; // Default to 1 hour
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}