```java
package com.alx.chat.repository;

import com.alx.chat.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) // Use Testcontainers DB
public class UserRepositoryTest {

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
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop"); // Ensure schema is created for tests
    }

    @Autowired
    private UserRepository userRepository;

    @Test
    void findByUsername_shouldReturnUser() {
        User user = new User(null, "testuser", "test@example.com", "password", LocalDateTime.now(), null, Set.of("ROLE_USER"), null, null);
        userRepository.save(user);

        Optional<User> found = userRepository.findByUsername("testuser");

        assertThat(found).isPresent();
        assertThat(found.get().getUsername()).isEqualTo("testuser");
    }

    @Test
    void findByEmail_shouldReturnUser() {
        User user = new User(null, "testuser2", "test2@example.com", "password", LocalDateTime.now(), null, Set.of("ROLE_USER"), null, null);
        userRepository.save(user);

        Optional<User> found = userRepository.findByEmail("test2@example.com");

        assertThat(found).isPresent();
        assertThat(found.get().getEmail()).isEqualTo("test2@example.com");
    }

    @Test
    void existsByUsername_shouldReturnTrue() {
        User user = new User(null, "existuser", "exist@example.com", "password", LocalDateTime.now(), null, Set.of("ROLE_USER"), null, null);
        userRepository.save(user);

        Boolean exists = userRepository.existsByUsername("existuser");

        assertThat(exists).isTrue();
    }

    @Test
    void findByUsernameOrEmail_shouldReturnUserByUsername() {
        User user = new User(null, "oruser", "or@example.com", "password", LocalDateTime.now(), null, Set.of("ROLE_USER"), null, null);
        userRepository.save(user);

        Optional<User> found = userRepository.findByUsernameOrEmail("oruser", "nonexistent@example.com");

        assertThat(found).isPresent();
        assertThat(found.get().getUsername()).isEqualTo("oruser");
    }

    @Test
    void findByUsernameOrEmail_shouldReturnUserByEmail() {
        User user = new User(null, "oruser2", "or2@example.com", "password", LocalDateTime.now(), null, Set.of("ROLE_USER"), null, null);
        userRepository.save(user);

        Optional<User> found = userRepository.findByUsernameOrEmail("nonexistentuser", "or2@example.com");

        assertThat(found).isPresent();
        assertThat(found.get().getEmail()).isEqualTo("or2@example.com");
    }

    @Test
    void findByUsernameOrEmail_shouldReturnEmpty() {
        Optional<User> found = userRepository.findByUsernameOrEmail("nonexistent", "nonexistent@example.com");
        assertThat(found).isNotPresent();
    }
}
```