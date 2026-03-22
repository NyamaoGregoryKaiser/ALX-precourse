package com.alx.auth.system.data.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/**
 * JPA Entity representing a user in the authentication system.
 * Implements UserDetails for Spring Security integration, providing core user information.
 *
 * @Data: Lombok annotation to generate getters, setters, toString, equals, and hashCode.
 * @Builder: Lombok annotation to provide a builder pattern for object creation.
 * @NoArgsConstructor: Lombok annotation to generate a no-argument constructor.
 * @AllArgsConstructor: Lombok annotation to generate a constructor with all fields.
 * @Entity: Marks this class as a JPA entity.
 * @Table: Specifies the table name in the database.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "_user") // Avoids conflict with SQL 'user' keyword
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String firstname;

    @Column(nullable = false)
    private String lastname;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING) // Store enum as String in DB
    @Column(nullable = false)
    private Role role;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Returns the authorities granted to the user.
     * In this case, it's a list containing a single SimpleGrantedAuthority based on the user's role.
     *
     * @return A collection of GrantedAuthority.
     */
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    /**
     * Returns the password used to authenticate the user.
     *
     * @return The user's hashed password.
     */
    @Override
    public String getPassword() {
        return password;
    }

    /**
     * Returns the username used to authenticate the user.
     * In this system, the email is used as the username.
     *
     * @return The user's email address.
     */
    @Override
    public String getUsername() {
        return email;
    }

    /**
     * Indicates whether the user's account has expired.
     * An expired account cannot be authenticated.
     *
     * @return true if the user's account is valid (non-expired), false otherwise.
     */
    @Override
    public boolean isAccountNonExpired() {
        return true; // For simplicity, accounts don't expire in this example
    }

    /**
     * Indicates whether the user is locked or unlocked.
     * A locked user cannot be authenticated.
     *
     * @return true if the user is not locked, false otherwise.
     */
    @Override
    public boolean isAccountNonLocked() {
        return true; // For simplicity, accounts are not locked in this example
    }

    /**
     * Indicates whether the user's credentials (password) have expired.
     * Expired credentials prevent authentication.
     *
     * @return true if the user's credentials are valid (non-expired), false otherwise.
     */
    @Override
    public boolean isCredentialsNonExpired() {
        return true; // For simplicity, credentials don't expire in this example
    }

    /**
     * Indicates whether the user is enabled or disabled.
     * A disabled user cannot be authenticated.
     *
     * @return true if the user is enabled, false otherwise.
     */
    @Override
    public boolean isEnabled() {
        return true; // For simplicity, all users are enabled by default
    }
}