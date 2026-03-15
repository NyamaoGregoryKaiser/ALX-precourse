package com.ml_utilities_system.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "models",
        uniqueConstraints = @UniqueConstraint(columnNames = {"name", "version"}))
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

    private String description;

    @Column(nullable = false)
    private Integer version;

    @Column(nullable = false)
    private String algorithm; // e.g., RandomForest, LogisticRegression

    private String modelPath; // S3 path, local path to serialized model

    private Double performanceMetric; // e.g., accuracy, F1-score

    @Column(nullable = false)
    private String status; // e.g., TRAINING, DEPLOYED, ARCHIVED

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "model_features",
            joinColumns = @JoinColumn(name = "model_id"),
            inverseJoinColumns = @JoinColumn(name = "feature_id"))
    private Set<Feature> features = new HashSet<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dataset_id")
    private Dataset trainingDataset;

    @Column(nullable = false, updatable = false)
    private LocalDateTime registeredAt;

    private LocalDateTime lastModifiedAt;

    @PrePersist
    protected void onCreate() {
        registeredAt = LocalDateTime.now();
        lastModifiedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        lastModifiedAt = LocalDateTime.now();
    }
}