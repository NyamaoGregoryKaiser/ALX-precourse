```java
package com.ml.utilities.system.repository;

import com.ml.utilities.system.model.Role;
import com.ml.utilities.system.model.User;
import org.junit.jupiter.api.BeforeEach;
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

import java.util.Collections;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) // Disable default in-memory DB
class UserRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("testuser")
            .withPassword("testpass");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop"); // Ensure schema is created for test
    }

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private RoleRepository roleRepository; // Needed to persist roles
    @Autowired
    private TestEntityManager entityManager;

    private User user;
    private Role userRole;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll(); // Clear before each test
        roleRepository.deleteAll();

        userRole = new Role("USER");
        entityManager.persistAndFlush(userRole);

        user = new User();
        user.setUsername("testuser");
        user.setEmail("test@example.com");
        user.setPassword("password");
        user.setRoles(Collections.singleton(userRole));
        entityManager.persistAndFlush(user);
    }

    @Test
    void findByUsername_Found() {
        Optional<User> foundUser = userRepository.findByUsername("testuser");
        assertTrue(foundUser.isPresent());
        assertEquals("test@example.com", foundUser.get().getEmail());
    }

    @Test
    void findByUsername_NotFound() {
        Optional<User> foundUser = userRepository.findByUsername("nonexistent");
        assertFalse(foundUser.isPresent());
    }

    @Test
    void findByEmail_Found() {
        Optional<User> foundUser = userRepository.findByEmail("test@example.com");
        assertTrue(foundUser.isPresent());
        assertEquals("testuser", foundUser.get().getUsername());
    }

    @Test
    void findByEmail_NotFound() {
        Optional<User> foundUser = userRepository.findByEmail("nonexistent@example.com");
        assertFalse(foundUser.isPresent());
    }

    @Test
    void existsByUsername_True() {
        assertTrue(userRepository.existsByUsername("testuser"));
    }

    @Test
    void existsByUsername_False() {
        assertFalse(userRepository.existsByUsername("nonexistent"));
    }

    @Test
    void existsByEmail_True() {
        assertTrue(userRepository.existsByEmail("test@example.com"));
    }

    @Test
    void existsByEmail_False() {
        assertFalse(userRepository.existsByEmail("nonexistent@example.com"));
    }

    @Test
    void saveUser_WithRole() {
        User newUser = new User();
        newUser.setUsername("newuser");
        newUser.setEmail("new@example.com");
        newUser.setPassword("newpass");
        newUser.setRoles(Collections.singleton(userRole)); // Associate with existing role

        User savedUser = userRepository.save(newUser);
        entityManager.flush(); // Ensure changes are written to DB for verification

        assertNotNull(savedUser.getId());
        assertEquals("newuser", savedUser.getUsername());
        assertFalse(savedUser.getRoles().isEmpty());
        assertTrue(savedUser.getRoles().stream().anyMatch(role -> role.getName().equals("USER")));
    }
}
```