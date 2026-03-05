```java
package com.alx.chat.service;

import com.alx.chat.ChatApplication;
import com.alx.chat.dto.auth.RegisterRequest;
import com.alx.chat.dto.user.UpdateUserRequest;
import com.alx.chat.dto.user.UserDto;
import com.alx.chat.entity.Role;
import com.alx.chat.entity.User;
import com.alx.chat.exception.ResourceNotFoundException;
import com.alx.chat.exception.UserAlreadyExistsException;
import com.alx.chat.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Collections;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest(classes = ChatApplication.class)
@Testcontainers
@DisplayName("User Service Integration Tests")
class UserServiceIntegrationTest {

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
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop"); // Ensures clean schema for each test run
        registry.add("spring.flyway.enabled", () -> false); // Disable Flyway for integration tests with create-drop
    }

    @Autowired
    private UserService userService;

    @Autowired
    private AuthService authService; // To easily create users
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    private Long testUserId;
    private String testUsername;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll(); // Clean up before each test
        RegisterRequest registerRequest = RegisterRequest.builder()
                .username("initialuser")
                .email("initial@example.com")
                .password("initialpass")
                .build();
        authService.register(registerRequest);
        User user = userRepository.findByUsername("initialuser").orElseThrow();
        testUserId = user.getId();
        testUsername = user.getUsername();
    }

    @AfterEach
    void tearDown() {
        userRepository.deleteAll();
    }

    @Test
    void getUserById_Success() {
        UserDto foundUser = userService.getUserById(testUserId);
        assertThat(foundUser).isNotNull();
        assertThat(foundUser.getUsername()).isEqualTo(testUsername);
        assertThat(foundUser.getEmail()).isEqualTo("initial@example.com");
    }

    @Test
    void getUserById_NotFound() {
        assertThrows(ResourceNotFoundException.class, () -> userService.getUserById(999L));
    }

    @Test
    void getUserByUsername_Success() {
        UserDto foundUser = userService.getUserByUsername(testUsername);
        assertThat(foundUser).isNotNull();
        assertThat(foundUser.getUsername()).isEqualTo(testUsername);
    }

    @Test
    void getUserByUsername_NotFound() {
        assertThrows(ResourceNotFoundException.class, () -> userService.getUserByUsername("nonexistent"));
    }

    @Test
    void updateUser_Success_AllFieldsChanged() {
        UpdateUserRequest request = UpdateUserRequest.builder()
                .username("updateduser")
                .email("updated@example.com")
                .password("newpass")
                .build();

        UserDto updatedUser = userService.updateUser(testUserId, request, testUsername);

        assertThat(updatedUser).isNotNull();
        assertThat(updatedUser.getUsername()).isEqualTo("updateduser");
        assertThat(updatedUser.getEmail()).isEqualTo("updated@example.com");

        User savedUser = userRepository.findById(testUserId).orElseThrow();
        assertThat(savedUser.getUsername()).isEqualTo("updateduser");
        assertThat(savedUser.getEmail()).isEqualTo("updated@example.com");
        assertThat(passwordEncoder.matches("newpass", savedUser.getPassword())).isTrue();
    }

    @Test
    void updateUser_UsernameAlreadyExists() {
        // Create another user
        RegisterRequest anotherUserRequest = RegisterRequest.builder()
                .username("anotheruser")
                .email("another@example.com")
                .password("anotherpass")
                .build();
        authService.register(anotherUserRequest);

        UpdateUserRequest request = UpdateUserRequest.builder()
                .username("anotheruser") // Try to change to existing username
                .build();

        assertThrows(UserAlreadyExistsException.class, () -> userService.updateUser(testUserId, request, testUsername));
    }

    @Test
    void deleteUser_Success() {
        userService.deleteUser(testUserId);
        assertThat(userRepository.findById(testUserId)).isEmpty();
        assertThrows(ResourceNotFoundException.class, () -> userService.getUserById(testUserId));
    }

    @Test
    void deleteUser_NotFound() {
        assertThrows(ResourceNotFoundException.class, () -> userService.deleteUser(999L));
    }
}
```