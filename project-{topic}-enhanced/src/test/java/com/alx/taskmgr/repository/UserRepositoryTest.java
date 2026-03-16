```java
package com.alx.taskmgr.repository;

import com.alx.taskmgr.model.Role;
import com.alx.taskmgr.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("dev") // Use H2 in-memory database for testing
@DisplayName("UserRepository Unit/Integration Tests")
public class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        // Clear repository before each test to ensure isolation
        userRepository.deleteAll();

        testUser = User.builder()
                .username("testuser")
                .email("test@example.com")
                .password("encodedpassword") // Password would be encoded in real scenarios
                .role(Role.ROLE_USER)
                .build();
        userRepository.save(testUser);
    }

    @Test
    @DisplayName("Should find user by username")
    void shouldFindUserByUsername() {
        Optional<User> foundUser = userRepository.findByUsername("testuser");
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getUsername()).isEqualTo("testuser");
    }

    @Test
    @DisplayName("Should return empty optional for non-existent username")
    void shouldReturnEmptyForNonExistentUsername() {
        Optional<User> foundUser = userRepository.findByUsername("nonexistent");
        assertThat(foundUser).isNotPresent();
    }

    @Test
    @DisplayName("Should check if username exists")
    void shouldCheckIfUsernameExists() {
        Boolean exists = userRepository.existsByUsername("testuser");
        assertThat(exists).isTrue();

        Boolean notExists = userRepository.existsByUsername("anotheruser");
        assertThat(notExists).isFalse();
    }

    @Test
    @DisplayName("Should check if email exists")
    void shouldCheckIfEmailExists() {
        Boolean exists = userRepository.existsByEmail("test@example.com");
        assertThat(exists).isTrue();

        Boolean notExists = userRepository.existsByEmail("another@example.com");
        assertThat(notExists).isFalse();
    }

    @Test
    @DisplayName("Should save a new user")
    void shouldSaveNewUser() {
        User newUser = User.builder()
                .username("newuser")
                .email("new@example.com")
                .password("newencodedpassword")
                .role(Role.ROLE_USER)
                .build();
        User savedUser = userRepository.save(newUser);

        assertThat(savedUser).isNotNull();
        assertThat(savedUser.getId()).isNotNull();
        assertThat(savedUser.getUsername()).isEqualTo("newuser");
    }

    @Test
    @DisplayName("Should delete a user by ID")
    void shouldDeleteUserById() {
        userRepository.deleteById(testUser.getId());
        Optional<User> foundUser = userRepository.findById(testUser.getId());
        assertThat(foundUser).isNotPresent();
    }
}
```