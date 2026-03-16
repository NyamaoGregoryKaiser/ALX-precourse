```java
package com.alx.scrapineer.data.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Represents a website or a specific page to be scraped.
 */
@Entity
@Table(name = "scraping_targets", uniqueConstraints = {@UniqueConstraint(columnNames = {"name", "user_id"})})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScrapingTarget {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String url;

    private String description;

    @Column(nullable = false)
    private boolean active = true;

    @OneToMany(mappedBy = "target", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<CssSelector> selectors;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
```