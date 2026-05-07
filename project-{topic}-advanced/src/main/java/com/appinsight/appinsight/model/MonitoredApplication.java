package com.appinsight.appinsight.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "monitored_applications",
        uniqueConstraints = {@UniqueConstraint(columnNames = "name")})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonitoredApplication extends BaseEntity {

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false, unique = true)
    private String apiKey; // Used for external systems to identify and authenticate

    @OneToMany(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<Metric> metrics = new HashSet<>();

    // Business Logic: Generate a simple API key. In production, use a more robust generator.
    @PrePersist
    public void generateApiKey() {
        if (this.apiKey == null || this.apiKey.isEmpty()) {
            this.apiKey = java.util.UUID.randomUUID().toString();
        }
    }
}