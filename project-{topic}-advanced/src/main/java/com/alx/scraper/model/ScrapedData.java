package com.alx.scraper.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Represents the data scraped from a single execution of a ScrapingJob.
 * The actual scraped content is stored as a JSON string.
 *
 * This entity is mapped to the 'scraped_data' table in the database.
 *
 * ALX Focus: Storing flexible, unstructured data (JSON) within a relational model,
 * demonstrating how to handle varying data schemas resulting from web scraping.
 */
@Entity
@Table(name = "scraped_data")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ScrapedData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) // Many scraped data entries belong to one job
    @JoinColumn(name = "job_id", nullable = false) // Foreign key column
    private ScrapingJob scrapingJob;

    // Store scraped data as a JSON string. This allows flexibility for various structures.
    @Column(name = "data_json", columnDefinition = "TEXT", nullable = false)
    private String dataJson;

    @CreationTimestamp
    @Column(name = "scraped_at", nullable = false, updatable = false)
    private LocalDateTime scrapedAt;
}