package com.alx.scraper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "scraping_jobs", indexes = {
        @Index(name = "idx_scraping_job_status", columnList = "status"),
        @Index(name = "idx_scraping_job_user_id", columnList = "user_id")
})
public class ScrapingJob {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String jobName;

    @Column(nullable = false, length = 2048)
    private String targetUrl;

    private String description;

    // Store CSS selectors as JSONB
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, String> selectors;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ScrapingStatus status;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime startedAt;
    private LocalDateTime completedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private Integer maxPagesToScrape;
    private String nextPageSelector;
    private Integer pagesScrapedCount = 0; // Track pages scraped for multi-page jobs

    @OneToMany(mappedBy = "scrapingJob", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<ScrapedData> scrapedData;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = ScrapingStatus.CREATED;
        }
    }
}