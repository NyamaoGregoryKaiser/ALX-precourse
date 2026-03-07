```java
package com.ml.utilities.system.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "datasets", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"name", "version"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Dataset {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, length = 50)
    private String version;

    @Column(name = "source_uri", columnDefinition = "TEXT")
    private String sourceUri; // e.g., S3 path, HDFS path, URL

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "size_mb")
    private Long sizeMb;

    @Column(name = "row_count")
    private Long rowCount;

    @Column(length = 50)
    private String format; // e.g., CSV, Parquet, JSON

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