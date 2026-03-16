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

/**
 * Defines a CSS selector for extracting specific data from a ScrapingTarget.
 */
@Entity
@Table(name = "css_selectors")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CssSelector {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_id", nullable = false)
    private ScrapingTarget target;

    @Column(nullable = false)
    private String name; // e.g., "product_title", "price", "image_url"

    @Column(nullable = false)
    private String selectorValue; // e.g., ".product-title h1", "span.price", "img.main-image::attr(src)"

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SelectorType type; // TEXT, ATTRIBUTE, HTML

    private String attributeName; // Used if type is ATTRIBUTE, e.g., "src", "href"

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
```