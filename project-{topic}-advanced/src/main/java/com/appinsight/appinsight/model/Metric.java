package com.appinsight.appinsight.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "metrics",
        uniqueConstraints = {@UniqueConstraint(columnNames = {"name", "application_id"})})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Metric extends BaseEntity {

    @Column(nullable = false)
    private String name;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MetricType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private MonitoredApplication application;
}