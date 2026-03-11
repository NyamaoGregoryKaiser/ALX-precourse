```java
package com.alx.taskmgr.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Represents a task category.
 * Each category has a unique name and can be associated with multiple tasks.
 */
@Entity
@Table(name = "categories", uniqueConstraints = {
        @UniqueConstraint(columnNames = "name", name = "uk_category_name")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id") // Only use ID for equality checks
@ToString(exclude = "tasks") // Exclude tasks to prevent infinite loop in toString
public class Category {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // One-to-many relationship with Task entity.
    // A category can have many tasks.
    // mappedBy indicates the field in the Task entity that owns the relationship.
    // CascadeType.ALL means all operations (persist, merge, remove, refresh, detach) will cascade from Category to Task.
    // orphanRemoval = true means if a task is removed from this collection, it will be deleted from the database.
    @OneToMany(mappedBy = "category", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Task> tasks = new HashSet<>();
}
```