```java
package com.alx.webscraper.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Represents a single web scraping task defined by the user.
 * Contains configuration for what to scrape, where, and how often.
 */
@Entity
@Table(name = "scraping_tasks")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScrapingTask {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name; // Name of the scraping task

    @Column(nullable = false)
    private String targetUrl; // The URL to scrape

    @ElementCollection(fetch = FetchType.EAGER) // Eagerly load data fields with the task
    @CollectionTable(name = "task_data_fields", joinColumns = @JoinColumn(name = "task_id"))
    private List<DataField> dataFields; // List of fields to extract, defined by CSS selectors

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ScrapingTaskStatus status; // Current status of the task (e.g., PENDING, RUNNING, COMPLETED, FAILED)

    @Column(nullable = true)
    private String cronExpression; // CRON expression for scheduling (e.g., "0 0 12 * * ?")

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Column(nullable = true)
    private LocalDateTime lastRunAt;

    @Column(nullable = true)
    private String lastRunMessage; // Message from the last run, e.g., success or error

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private com.alx.webscraper.auth.model.User user; // User who owns this task

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = ScrapingTaskStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
```