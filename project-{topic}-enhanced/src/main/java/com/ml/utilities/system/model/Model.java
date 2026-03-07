```java
package com.ml.utilities.system.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "models", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"name", "version"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Model {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, length = 50)
    private String version;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "experiment_id")
    private Experiment experiment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dataset_id")
    private Dataset dataset; // The dataset used to train this model

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "feature_set_id")
    private FeatureSet featureSet; // The feature set used by this model

    @Column(name = "model_uri", columnDefinition = "TEXT")
    private String modelUri; // e.g., S3 path, local path to saved model

    @Column(length = 100)
    private String framework; // e.g., Scikit-learn, TensorFlow, PyTorch

    @Column(precision = 5, scale = 4)
    private BigDecimal accuracy;

    @Column(name = "f1_score", precision = 5, scale = 4)
    private BigDecimal f1Score;

    @Column(name = "precision_score", precision = 5, scale = 4)
    private BigDecimal precisionScore;

    @Column(name = "recall_score", precision = 5, scale = 4)
    private BigDecimal recallScore;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private User createdBy;
}
```