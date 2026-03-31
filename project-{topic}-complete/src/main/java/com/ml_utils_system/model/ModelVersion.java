```java
package com.ml_utils_system.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.Set;

/**
 * Represents a specific version of a Machine Learning Model.
 * This entity stores details unique to a particular iteration of an ML model,
 * such as its version number, performance metrics, deployment status, and associated features.
 */
@Entity
@Table(name = "model_versions", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"model_id", "version_number"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ModelVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "model_id", nullable = false)
    private Model model;

    @Column(nullable = false)
    private String versionNumber; // e.g., "1.0", "1.1-production", "2.0-experimental"

    private String artifactPath; // S3 path or local path to the serialized model artifact (e.g., .pkl, .h5)

    @Column(columnDefinition = "TEXT")
    private String trainingMetrics; // JSON string of metrics (e.g., {"accuracy": 0.92, "precision": 0.88})

    @Column(columnDefinition = "TEXT")
    private String deploymentStatus; // e.g., "Development", "Staging", "Production", "Archived"

    private LocalDateTime deployedAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "model_version_features",
            joinColumns = @JoinColumn(name = "model_version_id"),
            inverseJoinColumns = @JoinColumn(name = "feature_definition_id")
    )
    private Set<FeatureDefinition> features; // Features used by this specific model version

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Helper method to add a feature for bidirectional relationship consistency
    public void addFeature(FeatureDefinition feature) {
        this.features.add(feature);
    }

    // Helper method to remove a feature
    public void removeFeature(FeatureDefinition feature) {
        this.features.remove(feature);
    }
}
```