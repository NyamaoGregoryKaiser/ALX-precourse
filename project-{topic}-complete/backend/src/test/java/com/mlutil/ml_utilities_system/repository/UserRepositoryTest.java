package com.mlutil.ml_utilities_system.repository;

import com.mlutil.ml_utilities_system.model.Role;
import com.mlutil.ml_utilities_system.model.User;
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

import java.util.Collections;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) // Use Testcontainers DB
class UserRepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    private Role userRole;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll(); // Clean up before each test
        roleRepository.deleteAll();

        userRole = Role.builder().name("ROLE_USER").build();
        roleRepository.save(userRole);
    }

    @Test
    @DisplayName("Should save a new user successfully")
    void shouldSaveUser() {
        Set<Role> roles = new HashSet<>(Collections.singletonList(userRole));
        User user = User.builder()
                .username("testuser")
                .email("test@example.com")
                .password("encodedpassword")
                .roles(roles)
                .build();

        User savedUser = userRepository.save(user);

        assertThat(savedUser).isNotNull();
        assertThat(savedUser.getId()).isNotNull();
        assertThat(savedUser.getUsername()).isEqualTo("testuser");
        assertThat(savedUser.getRoles()).containsExactly(userRole);
    }

    @Test
    @DisplayName("Should find user by username")
    void shouldFindByUsername() {
        Set<Role> roles = new HashSet<>(Collections.singletonList(userRole));
        User user = User.builder()
                .username("findme")
                .email("findme@example.com")
                .password("encodedpassword")
                .roles(roles)
                .build();
        userRepository.save(user);

        Optional<User> foundUser = userRepository.findByUsername("findme");

        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getUsername()).isEqualTo("findme");
    }

    @Test
    @DisplayName("Should return empty optional if user not found by username")
    void shouldReturnEmptyWhenUserNotFound() {
        Optional<User> foundUser = userRepository.findByUsername("nonexistent");
        assertThat(foundUser).isEmpty();
    }

    @Test
    @DisplayName("Should check if user exists by username")
    void shouldExistsByUsername() {
        Set<Role> roles = new HashSet<>(Collections.singletonList(userRole));
        User user = User.builder()
                .username("existinguser")
                .email("existing@example.com")
                .password("encodedpassword")
                .roles(roles)
                .build();
        userRepository.save(user);

        boolean exists = userRepository.existsByUsername("existinguser");
        assertThat(exists).isTrue();

        boolean notExists = userRepository.existsByUsername("nonexistent");
        assertThat(notExists).isFalse();
    }

    @Test
    @DisplayName("Should check if user exists by email")
    void shouldExistsByEmail() {
        Set<Role> roles = new HashSet<>(Collections.singletonList(userRole));
        User user = User.builder()
                .username("emailuser")
                .email("email@example.com")
                .password("encodedpassword")
                .roles(roles)
                .build();
        userRepository.save(user);

        boolean exists = userRepository.existsByEmail("email@example.com");
        assertThat(exists).isTrue();

        boolean notExists = userRepository.existsByEmail("nonexistent@example.com");
        assertThat(notExists).isFalse();
    }
}