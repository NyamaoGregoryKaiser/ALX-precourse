package com.alx.scraper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Setter
@Entity
@Table(name = "scraped_data", indexes = {
        @Index(name = "idx_scraped_data_job_id", columnList = "job_id"),
        @Index(name = "idx_scraped_data_url", columnList = "url")
})
public class ScrapedData {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private ScrapingJob scrapingJob;

    @Column(nullable = false, length = 2048) // Longer URL storage
    private String url;

    // Using PostgreSQL JSONB type for flexible data storage
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, String> extractedData;

    @Column(nullable = false)
    private LocalDateTime scrapedAt;

    @PrePersist
    protected void onCreate() {
        if (scrapedAt == null) {
            scrapedAt = LocalDateTime.now();
        }
    }
}