package com.alx.scraper.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.HashSet;

/**
 * Represents a user in the AlxScraper system.
 * Users can create and manage scraping jobs.
 *
 * This entity is mapped to the 'users' table in the database.
 * It includes fields for user credentials, roles, and auditing timestamps.
 *
 * ALX Focus: Demonstrates object-relational mapping (ORM) with JPA,
 * proper handling of sensitive data (password hash), and managing
 * relationships (one-to-many with ScrapingJob, many-to-many with Role via String).
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String username;

    @Column(nullable = false, length = 255) // Store BCrypt hash
    private String password;

    @ElementCollection(fetch = FetchType.EAGER) // Eagerly load roles
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "role")
    private Set<String> roles = new HashSet<>(); // e.g., "ROLE_USER", "ROLE_ADMIN"

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // One-to-many relationship with ScrapingJob.
    // 'mappedBy' indicates that the 'user' field in ScrapingJob is the owning side.
    // CascadeType.ALL ensures that if a User is deleted, their jobs are also deleted.
    // OrphanRemoval ensures that if a job is removed from the user's jobs collection, it's also deleted.
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<ScrapingJob> scrapingJobs = new HashSet<>();

    /**
     * Convenience method to add a role to the user.
     * @param role The role to add (e.g., "ROLE_USER").
     */
    public void addRole(String role) {
        this.roles.add(role);
    }

    /**
     * Convenience method to remove a role from the user.
     * @param role The role to remove.
     */
    public void removeRole(String role) {
        this.roles.remove(role);
    }
}