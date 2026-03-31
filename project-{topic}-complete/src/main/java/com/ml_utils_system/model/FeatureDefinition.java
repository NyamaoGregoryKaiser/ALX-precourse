```java
package com.ml_utils_system.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Represents a definition for a feature that can be used in ML models.
 * This can include raw features from a dataset or engineered features.
 */
@Entity
@Table(name = "feature_definitions", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"name", "version"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FeatureDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name; // e.g., "customer_age", "transformed_income"

    @Column(nullable = false)
    private String type; // e.g., "NUMERIC", "CATEGORICAL", "TEXT"

    @Column(nullable = false)
    private String version; // Version of the feature definition, e.g., "v1.0"

    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dataset_id") // Optional: Link to the dataset it originates from
    private Dataset sourceDataset;

    @Column(columnDefinition = "TEXT")
    private String transformationLogic; // Code/description of how the feature is derived/transformed

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
```