package com.alx.taskmgr.repository;

import com.alx.taskmgr.entity.Role;
import com.alx.taskmgr.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit/Integration tests for the UserRepository using H2 in-memory database.
 * @DataJpaTest: Configures only JPA components, enabling focused testing of repositories.
 * @AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY): Replaces the default database
 * with an embedded in-memory database (H2 by default) for tests.
 * @ActiveProfiles("test"): Activates the "test" Spring profile.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@ActiveProfiles("test")
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TestEntityManager entityManager; // Used to manually persist entities for setup

    private Role userRole;
    private Role adminRole;

    @BeforeEach
    void setUp() {
        // Clear database before each test
        userRepository.deleteAll();
        entityManager.clear();

        // Create and persist roles
        userRole = new Role();
        userRole.setName("ROLE_USER");
        entityManager.persistAndFlush(userRole);

        adminRole = new Role();
        adminRole.setName("ROLE_ADMIN");
        entityManager.persistAndFlush(adminRole);
    }

    @Test
    @DisplayName("Should save a user successfully")
    void shouldSaveUser() {
        User user = new User();
        user.setUsername("testuser");
        user.setEmail("test@example.com");
        user.setPassword("password");
        user.setRoles(Set.of(userRole));

        User savedUser = userRepository.save(user);

        assertThat(savedUser).isNotNull();
        assertThat(savedUser.getId()).isNotNull();
        assertThat(savedUser.getUsername()).isEqualTo("testuser");
        assertThat(savedUser.getRoles()).hasSize(1).contains(userRole);
    }

    @Test
    @DisplayName("Should find user by username")
    void shouldFindByUsername() {
        User user = new User();
        user.setUsername("findbyname");
        user.setEmail("findbyname@example.com");
        user.setPassword("password");
        user.setRoles(Set.of(userRole));
        entityManager.persistAndFlush(user);

        Optional<User> foundUser = userRepository.findByUsername("findbyname");

        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getUsername()).isEqualTo("findbyname");
    }

    @Test
    @DisplayName("Should find user by email")
    void shouldFindByEmail() {
        User user = new User();
        user.setUsername("findbyemail");
        user.setEmail("findbyemail@example.com");
        user.setPassword("password");
        user.setRoles(Set.of(userRole));
        entityManager.persistAndFlush(user);

        Optional<User> foundUser = userRepository.findByEmail("findbyemail@example.com");

        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getEmail()).isEqualTo("findbyemail@example.com");
    }

    @Test
    @DisplayName("Should return empty when user not found by username")
    void shouldReturnEmptyWhenUsernameNotFound() {
        Optional<User> foundUser = userRepository.findByUsername("nonexistent");
        assertThat(foundUser).isEmpty();
    }

    @Test
    @DisplayName("Should check if username exists")
    void shouldCheckUsernameExists() {
        User user = new User();
        user.setUsername("existsuser");
        user.setEmail("exists@example.com");
        user.setPassword("password");
        user.setRoles(Set.of(userRole));
        entityManager.persistAndFlush(user);

        Boolean exists = userRepository.existsByUsername("existsuser");
        assertThat(exists).isTrue();

        Boolean notExists = userRepository.existsByUsername("nonexistent");
        assertThat(notExists).isFalse();
    }

    @Test
    @DisplayName("Should delete a user")
    void shouldDeleteUser() {
        User user = new User();
        user.setUsername("deleteuser");
        user.setEmail("delete@example.com");
        user.setPassword("password");
        user.setRoles(Set.of(userRole));
        entityManager.persistAndFlush(user);

        userRepository.deleteById(user.getId());

        Optional<User> deletedUser = userRepository.findById(user.getId());
        assertThat(deletedUser).isEmpty();
    }

    @Test
    @DisplayName("Should update user details")
    void shouldUpdateUser() {
        User user = new User();
        user.setUsername("updateuser");
        user.setEmail("update@example.com");
        user.setPassword("oldpassword");
        user.setRoles(Set.of(userRole));
        entityManager.persistAndFlush(user);

        user.setEmail("updated@example.com");
        user.setPassword("newpassword");
        user.getRoles().add(adminRole); // Add admin role

        User updatedUser = userRepository.save(user);

        assertThat(updatedUser.getEmail()).isEqualTo("updated@example.com");
        assertThat(updatedUser.getPassword()).isEqualTo("newpassword");
        assertThat(updatedUser.getRoles()).hasSize(2).contains(userRole, adminRole);
    }
}