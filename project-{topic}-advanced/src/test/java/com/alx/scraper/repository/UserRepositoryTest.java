package com.alx.scraper.repository;

import com.alx.scraper.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit/Integration tests for {@link UserRepository}.
 * Uses {@code @DataJpaTest} to focus on JPA components. An in-memory H2 database
 * is typically used for these tests, providing a fast and isolated environment.
 *
 * ALX Focus: Demonstrates repository layer testing. Validates database interactions
 * (CRUD, custom queries) in an isolated, controlled environment.
 */
@DataJpaTest // Configures H2, Spring Data JPA, and TestEntityManager
@ActiveProfiles("test") // Use a test profile for specific test configurations
@DisplayName("UserRepository Unit/Integration Tests")
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TestEntityManager entityManager; // Used for setup/teardown in tests

    private User testUser;

    @BeforeEach
    void setUp() {
        // Clear database before each test
        userRepository.deleteAll();

        // Create a test user
        testUser = new User();
        testUser.setUsername("testuser");
        testUser.setPassword("encodedPassword"); // Password would be encoded in a real scenario
        testUser.addRole("ROLE_USER");
        testUser.setCreatedAt(LocalDateTime.now());
        testUser.setUpdatedAt(LocalDateTime.now());
        entityManager.persistAndFlush(testUser); // Persist to H2 in-memory DB
    }

    @Test
    @DisplayName("Should find user by username successfully")
    void whenFindByUsername_thenReturnUser() {
        // When
        Optional<User> foundUser = userRepository.findByUsername(testUser.getUsername());

        // Then
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getUsername()).isEqualTo(testUser.getUsername());
        assertThat(foundUser.get().getRoles()).contains("ROLE_USER");
    }

    @Test
    @DisplayName("Should not find user for non-existent username")
    void whenFindByUsername_withNonExistentUser_thenReturnEmptyOptional() {
        // When
        Optional<User> foundUser = userRepository.findByUsername("nonexistentuser");

        // Then
        assertThat(foundUser).isNotPresent();
    }

    @Test
    @DisplayName("Should check if user exists by username successfully")
    void whenExistsByUsername_thenReturnTrue() {
        // When
        boolean exists = userRepository.existsByUsername(testUser.getUsername());

        // Then
        assertThat(exists).isTrue();
    }

    @Test
    @DisplayName("Should check if user exists by username and return false for non-existent user")
    void whenExistsByUsername_withNonExistentUser_thenReturnFalse() {
        // When
        boolean exists = userRepository.existsByUsername("anotheruser");

        // Then
        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("Should save a new user successfully")
    void whenSaveUser_thenPersistSuccessfully() {
        // Given
        User newUser = new User();
        newUser.setUsername("newuser");
        newUser.setPassword("newEncodedPassword");
        newUser.addRole("ROLE_USER");
        newUser.setCreatedAt(LocalDateTime.now());
        newUser.setUpdatedAt(LocalDateTime.now());

        // When
        User savedUser = userRepository.save(newUser);
        entityManager.flush(); // Ensure data is written
        entityManager.clear(); // Clear cache to fetch from DB

        Optional<User> foundUser = userRepository.findById(savedUser.getId());

        // Then
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getUsername()).isEqualTo("newuser");
        assertThat(foundUser.get().getId()).isNotNull();
    }

    @Test
    @DisplayName("Should update an existing user successfully")
    void whenUpdateUser_thenUpdateSuccessfully() {
        // Given
        testUser.setUsername("updateduser");
        testUser.removeRole("ROLE_USER");
        testUser.addRole("ROLE_ADMIN");
        testUser.setUpdatedAt(LocalDateTime.now());

        // When
        User updatedUser = userRepository.save(testUser);
        entityManager.flush();
        entityManager.clear();

        Optional<User> foundUser = userRepository.findById(updatedUser.getId());

        // Then
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getUsername()).isEqualTo("updateduser");
        assertThat(foundUser.get().getRoles()).contains("ROLE_ADMIN").doesNotContain("ROLE_USER");
    }

    @Test
    @DisplayName("Should delete a user successfully")
    void whenDeleteUser_thenDeleteSuccessfully() {
        // When
        userRepository.deleteById(testUser.getId());
        entityManager.flush();
        entityManager.clear();

        Optional<User> foundUser = userRepository.findById(testUser.getId());

        // Then
        assertThat(foundUser).isNotPresent();
    }
}
```