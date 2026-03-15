package com.ml_utilities_system.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "features",
        uniqueConstraints = @UniqueConstraint(columnNames = {"name", "version"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Feature {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false)
    private String type; // e.g., NUMERIC, CATEGORICAL, TEXT

    @Column(nullable = false)
    private Integer version;

    @Column(nullable = false)
    private String sourceDatasetId; // Reference to a dataset, could be a string for external ID or foreign key

    private String transformationLogic; // e.g., "log(x)", "one-hot encode"

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime lastModifiedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        lastModifiedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        lastModifiedAt = LocalDateTime.now();
    }
}