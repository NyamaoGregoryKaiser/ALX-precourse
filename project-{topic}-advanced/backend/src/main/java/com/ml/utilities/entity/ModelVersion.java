```java
package com.ml.utilities.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "model_versions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModelVersion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "model_id", nullable = false)
    private Model model;

    @Column(nullable = false)
    private String versionNumber; // e.g., "1.0.0", "1.0.1-beta"

    @Column(nullable = false)
    private String modelPath; // S3 path, local file system path, etc.

    private String metadata; // JSON string for model-specific info (e.g., input features, output format)

    private boolean isDefault; // Whether this is the default version for inference

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
```