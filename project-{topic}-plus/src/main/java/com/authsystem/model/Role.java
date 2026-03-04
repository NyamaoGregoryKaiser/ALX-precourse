package com.authsystem.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Represents a Role entity in the authentication system.
 * Roles are used for authorization, defining what actions a user can perform.
 *
 * This entity stores the name of the role (e.g., "ROLE_USER", "ROLE_ADMIN")
 * and maintains a many-to-many relationship with {@link User} entities.
 * It also includes audit fields for creation and last update timestamps.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "roles", uniqueConstraints = {
        @UniqueConstraint(columnNames = "name")
})
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Role name cannot be empty")
    @Size(min = 3, max = 50, message = "Role name must be between 3 and 50 characters")
    @Column(nullable = false, unique = true, length = 50)
    private String name; // e.g., ROLE_USER, ROLE_ADMIN

    @ManyToMany(mappedBy = "roles", fetch = FetchType.LAZY) // Lazy fetch for users, as roles might exist without users
    @Builder.Default
    private Set<User> users = new HashSet<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Lifecycle callback method executed before a new entity is persisted (inserted) into the database.
     * It sets the {@code createdAt} and {@code updatedAt} fields to the current timestamp.
     */
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Lifecycle callback method executed before an existing entity is updated in the database.
     * It updates the {@code updatedAt} field to the current timestamp.
     */
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Role role = (Role) o;
        return name.equals(role.name);
    }

    @Override
    public int hashCode() {
        return name.hashCode();
    }

    @Override
    public String toString() {
        return "Role(id=" + this.id + ", name=" + this.name + ")";
    }
}