```java
package com.ml_utils_system.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
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
 * Represents a user in the system.
 * Implements {@link UserDetails} for Spring Security integration.
 */
@Entity
@Table(name = "users",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = "username"),
                @UniqueConstraint(columnNames = "email")
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String username;

    @Column(nullable = false, length = 120)
    @JsonIgnore // Do not serialize password to JSON responses
    private String password;

    @Column(nullable = false, length = 50)
    private String email;

    @ManyToMany(fetch = FetchType.EAGER) // Fetch roles eagerly as they're crucial for authorization
    @JoinTable(name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roles = new HashSet<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public User(String username, String email, String password) {
        this.username = username;
        this.email = email;
        this.password = password;
    }

    // --- UserDetails implementation methods ---

    /**
     * Returns the authorities granted to the user. Cannot return null.
     * Maps the User's roles to Spring Security's GrantedAuthority objects.
     */
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return this.roles.stream()
                .map(role -> new SimpleGrantedAuthority(role.getName().name()))
                .collect(Collectors.toSet());
    }

    /**
     * Indicates whether the user's account has expired. An expired account cannot be authenticated.
     */
    @Override
    public boolean isAccountNonExpired() {
        return true; // For simplicity, accounts never expire in this sample
    }

    /**
     * Indicates whether the user is locked or unlocked. A locked user cannot be authenticated.
     */
    @Override
    public boolean isAccountNonLocked() {
        return true; // For simplicity, accounts are never locked in this sample
    }

    /**
     * Indicates whether the user's credentials (password) have expired. Expired credentials prevent authentication.
     */
    @Override
    public boolean isCredentialsNonExpired() {
        return true; // For simplicity, credentials never expire in this sample
    }

    /**
     * Indicates whether the user is enabled or disabled. A disabled user cannot be authenticated.
     */
    @Override
    public boolean isEnabled() {
        return true; // For simplicity, users are always enabled in this sample
    }
}
```