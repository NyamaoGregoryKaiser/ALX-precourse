```java
package com.alx.scrapineer.data.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Represents a scheduled or manual scraping job for a specific target.
 */
@Entity
@Table(name = "scraping_jobs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScrapingJob {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_id", nullable = false)
    private ScrapingTarget target;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JobStatus status;

    private String scheduleCron; // CRON expression for scheduling (e.g., "0 0 * * * *")

    @Column(name = "last_run_at")
    private LocalDateTime lastRunAt;

    @Column(name = "next_run_at")
    private LocalDateTime nextRunAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void prePersist() {
        if (status == null) {
            status = JobStatus.CREATED;
        }
    }
}
```