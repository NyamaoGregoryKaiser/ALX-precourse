```java
package com.ml_utils_system.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Represents a dataset managed by the system.
 * Contains metadata about the dataset, its location (e.g., file path, S3 URL),
 * and basic statistics.
 */
@Entity
@Table(name = "datasets")
@Data // Lombok: Generates getters, setters, toString, equals, hashCode
@NoArgsConstructor // Lombok: Generates a no-argument constructor
@AllArgsConstructor // Lombok: Generates an all-argument constructor
public class Dataset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    private String description;

    @Column(nullable = false)
    private String storagePath; // e.g., "uploads/dataset_iris.csv" or "s3://ml-bucket/data/iris.csv"

    @Column(nullable = false)
    private String fileType; // e.g., "CSV", "JSON", "Parquet"

    private Long sizeBytes; // Size of the dataset file in bytes

    private Integer numRows; // Number of rows in the dataset

    private Integer numColumns; // Number of columns in the dataset

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
```