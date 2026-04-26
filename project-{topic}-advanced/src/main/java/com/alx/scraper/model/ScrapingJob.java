package com.alx.scraper.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Represents a web scraping job defined by a user.
 * Each job specifies a target URL, CSS selector, and a schedule.
 *
 * This entity is mapped to the 'scraping_jobs' table in the database.
 *
 * ALX Focus: Demonstrates complex entity design, defining parameters for an "algorithm"
 * (the scraping process), enum for status management, and relationships (many-to-one with User,
 * one-to-many with ScrapedData).
 */
@Entity
@Table(name = "scraping_jobs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ScrapingJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) // Many jobs can belong to one user
    @JoinColumn(name = "user_id", nullable = false) // Foreign key column
    private User user;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "target_url", nullable = false, length = 2048)
    private String targetUrl;

    @Column(name = "css_selector", nullable = false, length = 512)
    private String cssSelector;

    @Column(name = "schedule_cron", length = 50) // CRON expression (e.g., "0 0 * * * *")
    private String scheduleCron;

    @Enumerated(EnumType.STRING) // Store enum as String in DB
    @Column(nullable = false, length = 20)
    private JobStatus status;

    @Column(name = "last_run_at")
    private LocalDateTime lastRunAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // One-to-many relationship with ScrapedData.
    // CascadeType.ALL ensures that if a Job is deleted, its scraped data is also deleted.
    @OneToMany(mappedBy = "scrapingJob", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<ScrapedData> scrapedData = new HashSet<>();

    /**
     * Enum to represent the status of a scraping job.
     * ALX Focus: Enums for better code readability and type safety, representing state.
     */
    public enum JobStatus {
        ACTIVE,
        INACTIVE,
        RUNNING,
        COMPLETED,
        FAILED
    }
}