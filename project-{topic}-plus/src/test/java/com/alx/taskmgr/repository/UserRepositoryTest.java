```java
package com.alx.taskmgr.repository;

import com.alx.taskmgr.entity.Role;
import com.alx.taskmgr.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for {@link UserRepository} using Testcontainers.
 * {@link DataJpaTest} auto-configures Spring Data JPA components.
 * {@link AutoConfigureTestDatabase#replace = AutoConfigureTestDatabase.Replace.NONE} disables
 * the default in-memory database and uses our Testcontainers-managed PostgreSQL.
 * {@link ActiveProfiles("test")} ensures test-specific application properties are used.
 */
@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class UserRepositoryTest {

    // Configure a PostgreSQL container for integration testing
    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("testuser")
            .withPassword("testpass");

    @Autowired
    private UserRepository userRepository;

    private User testUser;
    private User adminUser;

    @BeforeEach
    void setUp() {
        // Clear repository before each test
        userRepository.deleteAll();

        // Initialize test user data
        testUser = User.builder()
                .fullName("John Doe")
                .email("john.doe@example.com")
                .password("hashed_password_user")
                .roles(Set.of(Role.ROLE_USER))
                .build();

        adminUser = User.builder()
                .fullName("Admin User")
                .email("admin@example.com")
                .password("hashed_password_admin")
                .roles(Set.of(Role.ROLE_ADMIN, Role.ROLE_USER))
                .build();

        userRepository.save(testUser);
        userRepository.save(adminUser);
    }

    @Test
    @DisplayName("Should find user by email successfully")
    void shouldFindUserByEmail() {
        // When
        Optional<User> foundUser = userRepository.findByEmail(testUser.getEmail());

        // Then
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getEmail()).isEqualTo(testUser.getEmail());
        assertThat(foundUser.get().getFullName()).isEqualTo(testUser.getFullName());
    }

    @Test
    @DisplayName("Should return empty optional when user email not found")
    void shouldReturnEmptyOptionalWhenEmailNotFound() {
        // When
        Optional<User> foundUser = userRepository.findByEmail("nonexistent@example.com");

        // Then
        assertThat(foundUser).isNotPresent();
    }

    @Test
    @DisplayName("Should check if user exists by email successfully")
    void shouldCheckIfUserExistsByEmail() {
        // When
        boolean exists = userRepository.existsByEmail(testUser.getEmail());
        boolean notExists = userRepository.existsByEmail("another@example.com");

        // Then
        assertThat(exists).isTrue();
        assertThat(notExists).isFalse();
    }

    @Test
    @DisplayName("Should save a new user successfully")
    void shouldSaveNewUser() {
        // Given
        User newUser = User.builder()
                .fullName("Jane Smith")
                .email("jane.smith@example.com")
                .password("new_hashed_password")
                .roles(Set.of(Role.ROLE_USER))
                .build();

        // When
        User savedUser = userRepository.save(newUser);

        // Then
        assertThat(savedUser).isNotNull();
        assertThat(savedUser.getId()).isNotNull();
        assertThat(savedUser.getEmail()).isEqualTo("jane.smith@example.com");
        assertThat(userRepository.count()).isEqualTo(3); // 2 existing + 1 new
    }

    @Test
    @DisplayName("Should update an existing user")
    void shouldUpdateExistingUser() {
        // Given
        User userToUpdate = userRepository.findByEmail(testUser.getEmail()).get();
        userToUpdate.setFullName("John Updated");
        userToUpdate.setEmail("john.updated@example.com");

        // When
        User updatedUser = userRepository.save(userToUpdate);

        // Then
        assertThat(updatedUser).isNotNull();
        assertThat(updatedUser.getFullName()).isEqualTo("John Updated");
        assertThat(updatedUser.getEmail()).isEqualTo("john.updated@example.com");
        assertThat(userRepository.findByEmail(testUser.getEmail())).isNotPresent(); // Old email shouldn't exist
        assertThat(userRepository.findByEmail("john.updated@example.com")).isPresent();
    }

    @Test
    @DisplayName("Should delete a user by ID")
    void shouldDeleteUserById() {
        // Given
        Long userId = testUser.getId();

        // When
        userRepository.deleteById(userId);
        Optional<User> deletedUser = userRepository.findById(userId);

        // Then
        assertThat(deletedUser).isNotPresent();
        assertThat(userRepository.count()).isEqualTo(1); // One user remaining
    }

    @Test
    @DisplayName("Should retrieve all users")
    void shouldFindAllUsers() {
        // When
        Iterable<User> users = userRepository.findAll();

        // Then
        assertThat(users).hasSize(2);
        assertThat(users).extracting(User::getEmail).contains(testUser.getEmail(), adminUser.getEmail());
    }
}
```