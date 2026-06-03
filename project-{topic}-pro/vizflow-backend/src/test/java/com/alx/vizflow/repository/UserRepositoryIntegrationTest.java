```java
package com.alx.vizflow.repository;

import com.alx.vizflow.model.Role;
import com.alx.vizflow.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
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
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) // Don't replace our Testcontainer DB
@Import({BCryptPasswordEncoder.class}) // Import PasswordEncoder for encoding passwords
@DisplayName("User Repository Integration Tests")
class UserRepositoryIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("vizflow_test_db")
            .withUsername("test_user")
            .withPassword("test_password");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop"); // Ensure clean schema for tests
    }

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private RoleRepository roleRepository; // Needed to create roles for users
    @Autowired
    private TestEntityManager entityManager; // For direct DB operations if needed
    @Autowired
    private PasswordEncoder passwordEncoder;

    private User adminUser;
    private User regularUser;
    private Role adminRole;
    private Role userRole;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll(); // Clear before each test
        roleRepository.deleteAll();

        adminRole = roleRepository.save(new Role(null, Role.RoleName.ROLE_ADMIN));
        userRole = roleRepository.save(new Role(null, Role.RoleName.ROLE_USER));

        Set<Role> adminRoles = new HashSet<>();
        adminRoles.add(adminRole);

        Set<Role> userRoles = new HashSet<>();
        userRoles.add(userRole);

        adminUser = new User(null, "adminTest", passwordEncoder.encode("adminPass"), "admin@test.com", adminRoles, null, null);
        regularUser = new User(null, "userTest", passwordEncoder.encode("userPass"), "user@test.com", userRoles, null, null);

        // Persist users to database
        userRepository.save(adminUser);
        userRepository.save(regularUser);

        entityManager.flush(); // Ensure data is written to DB
        entityManager.clear(); // Clear JPA session to get fresh entities
    }

    @Test
    void testFindByUsername() {
        Optional<User> foundAdmin = userRepository.findByUsername("adminTest");
        assertThat(foundAdmin).isPresent();
        assertThat(foundAdmin.get().getUsername()).isEqualTo("adminTest");

        Optional<User> notFound = userRepository.findByUsername("nonexistent");
        assertThat(notFound).isNotPresent();
    }

    @Test
    void testExistsByUsername() {
        assertThat(userRepository.existsByUsername("adminTest")).isTrue();
        assertThat(userRepository.existsByUsername("nonexistent")).isFalse();
    }

    @Test
    void testFindByEmail() {
        Optional<User> foundUser = userRepository.findByEmail("user@test.com");
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getEmail()).isEqualTo("user@test.com");
    }

    @Test
    void testSaveUserWithRoles() {
        User newUser = new User(null, "newUser", passwordEncoder.encode("newPass"), "new@test.com",
                new HashSet<>(Collections.singletonList(userRole)), null, null);
        User savedUser = userRepository.save(newUser);

        assertThat(savedUser.getId()).isNotNull();
        assertThat(savedUser.getRoles()).hasSize(1);
        assertThat(savedUser.getRoles().iterator().next().getName()).isEqualTo(Role.RoleName.ROLE_USER);

        // Fetch again to ensure roles are eagerly loaded (due to FetchType.EAGER in User entity)
        User fetchedUser = userRepository.findById(savedUser.getId()).orElseThrow();
        assertThat(fetchedUser.getRoles()).hasSize(1);
    }
}
```