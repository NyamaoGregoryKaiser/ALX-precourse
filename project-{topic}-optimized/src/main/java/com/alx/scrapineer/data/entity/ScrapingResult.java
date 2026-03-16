```java
package com.alx.scrapineer.data.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Stores the results of a single scraping run.
 */
@Entity
@Table(name = "scraping_results")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScrapingResult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private ScrapingJob job;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_id", nullable = false)
    private ScrapingTarget target;

    @JdbcTypeCode(SqlTypes.JSON) // Persist Map as JSON B in PostgreSQL
    @Column(name = "extracted_data", columnDefinition = "jsonb", nullable = false)
    private Map<String, String> extractedData;

    @Column(nullable = false)
    private boolean successful;

    @Column(name = "error_message")
    private String errorMessage;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void prePersist() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }
}
```