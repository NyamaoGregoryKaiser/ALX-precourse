```java
package com.alx.vizflow.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "datasets")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Dataset {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "data_source_id", nullable = false)
    private DataSource dataSource;

    @Column(columnDefinition = "TEXT")
    private String queryOrTable; // SQL query or table name for SQL sources, or identifier for API/CSV

    @Column(columnDefinition = "TEXT")
    private String schemaDefinition; // JSON string defining column names and types { "column1": "STRING", "column2": "NUMBER" }

    @Column(columnDefinition = "TEXT")
    private String transformationLogic; // JSON string describing transformations (e.g., aggregations, filters)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
```