```java
package com.alx.dataviz.repository;

import com.alx.dataviz.model.Role;
import com.alx.dataviz.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserRepositoryTest {

    @Container
    public static PostgreSQLContainer<?> postgresContainer = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("testuser")
            .withPassword("testpass");

    @DynamicPropertySource
    static void setDatasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgresContainer::getJdbcUrl);
        registry.add("spring.datasource.username", postgresContainer::getUsername);
        registry.add("spring.datasource.password", postgresContainer::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop"); // Ensure clean schema for each test run
    }

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TestEntityManager entityManager; // For direct DB interaction if needed

    private User user1;
    private User user2;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll(); // Clean up before each test

        user1 = User.builder()
                .username("testuser1")
                .email("test1@example.com")
                .password("pass1")
                .roles(Set.of(Role.USER))
                .build();

        user2 = User.builder()
                .username("testuser2")
                .email("test2@example.com")
                .password("pass2")
                .roles(Set.of(Role.ADMIN, Role.USER))
                .build();

        entityManager.persistAndFlush(user1);
        entityManager.persistAndFlush(user2);
    }

    @Test
    @DisplayName("Should find user by username")
    void findByUsername_Success() {
        Optional<User> foundUser = userRepository.findByUsername("testuser1");

        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getUsername()).isEqualTo("testuser1");
        assertThat(foundUser.get().getEmail()).isEqualTo("test1@example.com");
        assertThat(foundUser.get().getRoles()).containsExactly(Role.USER);
    }

    @Test
    @DisplayName("Should not find user for non-existent username")
    void findByUsername_NotFound() {
        Optional<User> foundUser = userRepository.findByUsername("nonexistent");
        assertThat(foundUser).isNotPresent();
    }

    @Test
    @DisplayName("Should find user by email")
    void findByEmail_Success() {
        Optional<User> foundUser = userRepository.findByEmail("test2@example.com");

        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getUsername()).isEqualTo("testuser2");
        assertThat(foundUser.get().getEmail()).isEqualTo("test2@example.com");
    }

    @Test
    @DisplayName("Should check if username exists")
    void existsByUsername_True() {
        boolean exists = userRepository.existsByUsername("testuser1");
        assertThat(exists).isTrue();
    }

    @Test
    @DisplayName("Should check if username does not exist")
    void existsByUsername_False() {
        boolean exists = userRepository.existsByUsername("unknown");
        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("Should save a new user")
    void saveUser_Success() {
        User newUser = User.builder()
                .username("newuser")
                .email("new@example.com")
                .password("newpass")
                .roles(Set.of(Role.USER))
                .build();

        User savedUser = userRepository.save(newUser);
        entityManager.flush(); // Ensure it's persisted

        assertThat(savedUser).isNotNull();
        assertThat(savedUser.getId()).isNotNull();
        assertThat(savedUser.getUsername()).isEqualTo("newuser");

        Optional<User> found = userRepository.findById(savedUser.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getUsername()).isEqualTo("newuser");
    }

    @Test
    @DisplayName("Should update an existing user")
    void updateUser_Success() {
        user1.setEmail("updated1@example.com");
        user1.getRoles().add(Role.ADMIN); // Add new role

        User updatedUser = userRepository.save(user1);
        entityManager.flush();

        Optional<User> foundUser = userRepository.findById(user1.getId());
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getEmail()).isEqualTo("updated1@example.com");
        assertThat(foundUser.get().getRoles()).contains(Role.USER, Role.ADMIN);
    }

    @Test
    @DisplayName("Should delete a user")
    void deleteUser_Success() {
        userRepository.deleteById(user1.getId());
        entityManager.flush();

        Optional<User> foundUser = userRepository.findById(user1.getId());
        assertThat(foundUser).isNotPresent();
    }
}
```