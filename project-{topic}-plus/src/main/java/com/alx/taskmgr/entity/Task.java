```java
package com.alx.taskmgr.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Represents a task in the task management system.
 * Each task belongs to a user (owner) and a category.
 */
@Entity
@Table(name = "tasks")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id") // Only use ID for equality checks
@ToString(exclude = {"owner", "category"}) // Exclude owner and category to prevent infinite loop in toString
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private LocalDateTime dueDate;

    @Enumerated(EnumType.STRING) // Store enum as String in DB
    @Column(nullable = false)
    private TaskStatus status;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Many-to-one relationship with User entity.
    // Many tasks can belong to one user (owner).
    // The 'owner' field in Task is the owning side of the relationship.
    @ManyToOne(fetch = FetchType.LAZY) // Lazy loading for performance
    @JoinColumn(name = "owner_id", nullable = false) // Foreign key column
    private User owner;

    // Many-to-one relationship with Category entity.
    // Many tasks can belong to one category.
    // The 'category' field in Task is the owning side of the relationship.
    @ManyToOne(fetch = FetchType.LAZY) // Lazy loading for performance
    @JoinColumn(name = "category_id", nullable = false) // Foreign key column
    private Category category;
}
```