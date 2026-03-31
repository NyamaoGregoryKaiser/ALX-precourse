```java
package com.ml_utils_system.config;

import com.ml_utils_system.model.ERole;
import com.ml_utils_system.model.Role;
import com.ml_utils_system.model.User;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * Test configuration for Spring Security.
 * Provides an in-memory {@link UserDetailsService} for testing purposes
 * to avoid database dependencies in unit/integration tests that don't need real DB.
 */
@TestConfiguration
public class TestSecurityConfig {

    /**
     * Provides an {@link InMemoryUserDetailsManager} that contains predefined test users.
     * This bean is marked as {@code @Primary} to override the default {@link UserDetailsServiceImpl}
     * when the 'test' profile is active.
     *
     * @return An InMemoryUserDetailsManager instance configured with test users.
     */
    @Bean
    @Primary
    public UserDetailsService testUserDetailsService() {
        // Create roles
        Role userRole = new Role(1L, ERole.ROLE_USER);
        Role adminRole = new Role(2L, ERole.ROLE_ADMIN);

        // Create test admin user
        Set<Role> adminRoles = new HashSet<>();
        adminRoles.add(adminRole);
        adminRoles.add(userRole); // Admin also has user privileges
        User adminUser = new User(1L, "admin", "password", "admin@test.com", adminRoles, LocalDateTime.now(), LocalDateTime.now());

        // Create test regular user
        Set<Role> userRoles = Collections.singleton(userRole);
        User regularUser = new User(2L, "user", "password", "user@test.com", userRoles, LocalDateTime.now(), LocalDateTime.now());

        return new InMemoryUserDetailsManager(adminUser, regularUser);
    }
}
```