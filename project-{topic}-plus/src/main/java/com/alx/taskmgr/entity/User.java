```java
package com.alx.taskmgr.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Represents a user in the task management system.
 * Implements UserDetails for Spring Security integration.
 */
@Entity
@Table(name = "users", uniqueConstraints = {
        @UniqueConstraint(columnNames = "email", name = "uk_user_email")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id") // Only use ID for equality checks
@ToString(exclude = "tasks") // Exclude tasks to prevent infinite loop in toString
public class User implements UserDetails {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String fullName;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(nullable = false)
    private String password; // Stored as hashed value

    @ElementCollection(targetClass = Role.class, fetch = FetchType.EAGER) // Eagerly load roles
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Enumerated(EnumType.STRING) // Store enum as String in DB
    @Column(name = "role", nullable = false)
    private Set<Role> roles = new HashSet<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // One-to-many relationship with Task entity.
    // A user can own many tasks.
    // mappedBy indicates the field in the Task entity that owns the relationship.
    // CascadeType.ALL means all operations (persist, merge, remove, refresh, detach) will cascade from User to Task.
    // orphanRemoval = true means if a task is removed from this collection, it will be deleted from the database.
    @OneToMany(mappedBy = "owner", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Task> tasks = new HashSet<>();

    // UserDetails interface methods:
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream()
                .map(role -> new SimpleGrantedAuthority(role.name()))
                .collect(Collectors.toList());
    }

    @Override
    public String getUsername() {
        return email; // Use email as the username for Spring Security
    }

    @Override
    public boolean isAccountNonExpired() {
        return true; // For simplicity, accounts never expire
    }

    @Override
    public boolean isAccountNonLocked() {
        return true; // For simplicity, accounts are never locked
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true; // For simplicity, credentials never expire
    }

    @Override
    public boolean isEnabled() {
        return true; // For simplicity, accounts are always enabled
    }
}
```