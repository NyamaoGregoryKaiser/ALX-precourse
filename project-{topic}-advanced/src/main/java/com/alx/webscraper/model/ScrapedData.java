```java
package com.alx.webscraper.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Represents the data successfully scraped from a single execution of a ScrapingTask.
 * Stores a map of field names to their extracted values.
 */
@Entity
@Table(name = "scraped_data")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScrapedData {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private ScrapingTask scrapingTask; // The task that generated this data

    @ElementCollection(fetch = FetchType.EAGER) // Store extracted data as a map
    @CollectionTable(name = "scraped_data_values", joinColumns = @JoinColumn(name = "scraped_data_id"))
    @MapKeyColumn(name = "field_name")
    @Column(name = "field_value", columnDefinition = "TEXT")
    private Map<String, String> data; // Key-value pairs of extracted data (e.g., "productName": "Laptop X")

    @Column(nullable = false)
    private LocalDateTime scrapedAt;

    @Column(nullable = false)
    private String sourceUrl; // The actual URL from which the data was scraped

    @PrePersist
    protected void onCreate() {
        this.scrapedAt = LocalDateTime.now();
    }
}
```