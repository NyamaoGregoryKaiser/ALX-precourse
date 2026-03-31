```java
package com.ml_utils_system.repository;

import com.ml_utils_system.model.ERole;
import com.ml_utils_system.model.Role;
import com.ml_utils_system.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Integration tests for {@link UserRepository}.
 * Uses Testcontainers to spin up a real PostgreSQL instance for accurate testing.
 */
@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
public class UserRepositoryTest {

    @Container
    public static PostgreSQLContainer<?> postgresContainer = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void setDatasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgresContainer::getJdbcUrl);
        registry.add("spring.datasource.username", postgresContainer::getUsername);
        registry.add("spring.datasource.password", postgresContainer::getPassword);
        registry.add("spring.flyway.enabled", () -> "false"); // Disable Flyway for tests
    }

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository; // Need this to create roles for users

    private User adminUser;
    private User regularUser;
    private Role roleAdmin;
    private Role roleUser;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        roleRepository.deleteAll();

        roleUser = new Role(ERole.ROLE_USER);
        roleAdmin = new Role(ERole.ROLE_ADMIN);
        roleRepository.save(roleUser);
        roleRepository.save(roleAdmin);

        Set<Role> adminRoles = new HashSet<>();
        adminRoles.add(roleAdmin);
        adminRoles.add(roleUser);

        adminUser = new User("admin_test", "admin_test@example.com", "admin_password");
        adminUser.setRoles(adminRoles);
        adminUser.setCreatedAt(LocalDateTime.now());
        adminUser.setUpdatedAt(LocalDateTime.now());
        userRepository.save(adminUser);

        Set<Role> userRoles = Collections.singleton(roleUser);
        regularUser = new User("user_test", "user_test@example.com", "user_password");
        regularUser.setRoles(userRoles);
        regularUser.setCreatedAt(LocalDateTime.now());
        regularUser.setUpdatedAt(LocalDateTime.now());
        userRepository.save(regularUser);
    }

    @Test
    @DisplayName("Should find user by username")
    void findByUsername_success() {
        Optional<User> foundUser = userRepository.findByUsername("admin_test");
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getEmail()).isEqualTo("admin_test@example.com");
        assertThat(foundUser.get().getRoles()).contains(roleAdmin, roleUser);
    }

    @Test
    @DisplayName("Should not find non-existent user by username")
    void findByUsername_notFound() {
        Optional<User> foundUser = userRepository.findByUsername("nonexistent");
        assertThat(foundUser).isNotPresent();
    }

    @Test
    @DisplayName("Should check if user exists by username")
    void existsByUsername_true() {
        boolean exists = userRepository.existsByUsername("user_test");
        assertThat(exists).isTrue();
    }

    @Test
    @DisplayName("Should check if user does not exist by username")
    void existsByUsername_false() {
        boolean exists = userRepository.existsByUsername("another_user");
        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("Should check if user exists by email")
    void existsByEmail_true() {
        boolean exists = userRepository.existsByEmail("admin_test@example.com");
        assertThat(exists).isTrue();
    }

    @Test
    @DisplayName("Should check if user does not exist by email")
    void existsByEmail_false() {
        boolean exists = userRepository.existsByEmail("nonexistent@example.com");
        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("Should save a new user")
    void save_newUser_success() {
        User newUser = new User("new_user", "new_user@example.com", "new_password");
        newUser.setRoles(Collections.singleton(roleUser));
        User savedUser = userRepository.save(newUser);

        assertThat(savedUser.getId()).isNotNull();
        assertThat(savedUser.getUsername()).isEqualTo("new_user");
        assertThat(userRepository.count()).isEqualTo(3);
    }

    @Test
    @DisplayName("Should not save user with duplicate username")
    void save_duplicateUsername_failure() {
        User duplicateUser = new User("admin_test", "newemail@example.com", "password");
        duplicateUser.setRoles(Collections.singleton(roleUser));
        assertThrows(DataIntegrityViolationException.class, () -> userRepository.save(duplicateUser));
    }

    @Test
    @DisplayName("Should not save user with duplicate email")
    void save_duplicateEmail_failure() {
        User duplicateUser = new User("another_username", "admin_test@example.com", "password");
        duplicateUser.setRoles(Collections.singleton(roleUser));
        assertThrows(DataIntegrityViolationException.class, () -> userRepository.save(duplicateUser));
    }

    @Test
    @DisplayName("Should update an existing user")
    void update_existingUser_success() {
        User existingUser = userRepository.findByUsername("user_test").get();
        existingUser.setEmail("updated_user@example.com");
        userRepository.save(existingUser);

        User updatedUser = userRepository.findByUsername("user_test").get();
        assertThat(updatedUser.getEmail()).isEqualTo("updated_user@example.com");
    }

    @Test
    @DisplayName("Should delete a user by ID")
    void deleteById_success() {
        Long idToDelete = regularUser.getId();
        userRepository.deleteById(idToDelete);
        Optional<User> foundUser = userRepository.findById(idToDelete);
        assertThat(foundUser).isNotPresent();
        assertThat(userRepository.count()).isEqualTo(1);
    }
}
```