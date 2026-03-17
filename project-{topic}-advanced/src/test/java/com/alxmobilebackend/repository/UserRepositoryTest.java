```java
package com.alxmobilebackend.repository;

import com.alxmobilebackend.model.Role;
import com.alxmobilebackend.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.util.Collections;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TestEntityManager entityManager;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .username("testuser")
                .email("test@example.com")
                .password("encodedpassword")
                .roles(Collections.singleton(Role.ROLE_USER))
                .build();
        entityManager.persistAndFlush(testUser);
    }

    @Test
    @DisplayName("Should find user by username")
    void whenFindByUsername_thenReturnUser() {
        Optional<User> foundUser = userRepository.findByUsername(testUser.getUsername());
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getUsername()).isEqualTo(testUser.getUsername());
    }

    @Test
    @DisplayName("Should find user by email")
    void whenFindByEmail_thenReturnUser() {
        Optional<User> foundUser = userRepository.findByEmail(testUser.getEmail());
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getEmail()).isEqualTo(testUser.getEmail());
    }

    @Test
    @DisplayName("Should find user by username or email when given username")
    void whenFindByUsernameOrEmail_givenUsername_thenReturnUser() {
        Optional<User> foundUser = userRepository.findByUsernameOrEmail(testUser.getUsername(), "nonexistent@example.com");
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getUsername()).isEqualTo(testUser.getUsername());
    }

    @Test
    @DisplayName("Should find user by username or email when given email")
    void whenFindByUsernameOrEmail_givenEmail_thenReturnUser() {
        Optional<User> foundUser = userRepository.findByUsernameOrEmail("nonexistentuser", testUser.getEmail());
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getEmail()).isEqualTo(testUser.getEmail());
    }

    @Test
    @DisplayName("Should return empty when user not found by username")
    void whenFindByUsername_thenReturnsEmpty() {
        Optional<User> foundUser = userRepository.findByUsername("nonexistent");
        assertThat(foundUser).isEmpty();
    }

    @Test
    @DisplayName("Should return empty when user not found by email")
    void whenFindByEmail_thenReturnsEmpty() {
        Optional<User> foundUser = userRepository.findByEmail("nonexistent@example.com");
        assertThat(foundUser).isEmpty();
    }

    @Test
    @DisplayName("Should check if username exists")
    void whenExistsByUsername_thenReturnTrue() {
        boolean exists = userRepository.existsByUsername(testUser.getUsername());
        assertThat(exists).isTrue();
    }

    @Test
    @DisplayName("Should check if username does not exist")
    void whenExistsByUsername_thenReturnFalse() {
        boolean exists = userRepository.existsByUsername("nonexistent");
        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("Should check if email exists")
    void whenExistsByEmail_thenReturnTrue() {
        boolean exists = userRepository.existsByEmail(testUser.getEmail());
        assertThat(exists).isTrue();
    }

    @Test
    @DisplayName("Should check if email does not exist")
    void whenExistsByEmail_thenReturnFalse() {
        boolean exists = userRepository.existsByEmail("nonexistent@example.com");
        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("Should save a new user")
    void whenSaveUser_thenUserIsPersisted() {
        User newUser = User.builder()
                .username("newuser")
                .email("new@example.com")
                .password("anotherpassword")
                .roles(Set.of(Role.ROLE_USER))
                .build();

        User savedUser = userRepository.save(newUser);
        assertThat(savedUser).isNotNull();
        assertThat(savedUser.getId()).isNotNull();

        Optional<User> foundUser = userRepository.findById(savedUser.getId());
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getUsername()).isEqualTo("newuser");
    }

    @Test
    @DisplayName("Should delete a user")
    void whenDeleteUser_thenUserIsRemoved() {
        userRepository.deleteById(testUser.getId());
        Optional<User> foundUser = userRepository.findById(testUser.getId());
        assertThat(foundUser).isEmpty();
    }
}
```