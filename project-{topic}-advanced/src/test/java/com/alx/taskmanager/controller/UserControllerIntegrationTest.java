package com.alx.taskmanager.controller;

import com.alx.taskmanager.dto.JwtResponse;
import com.alx.taskmanager.dto.LoginRequest;
import com.alx.taskmanager.dto.RegisterRequest;
import com.alx.taskmanager.dto.UserDTO;
import com.alx.taskmanager.model.Role;
import com.alx.taskmanager.model.User;
import com.alx.taskmanager.model.UserRole;
import com.alx.taskmanager.repository.RoleRepository;
import com.alx.taskmanager.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Collections;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
public class UserControllerIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb_user")
            .withUsername("testuser")
            .withPassword("testpass");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.flyway.enabled", () -> "false");
    }

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String adminJwt;
    private String userJwt;
    private Long adminId;
    private Long userId;

    private String getBaseUrl() {
        return "http://localhost:" + port + "/api/users";
    }

    private String getAuthUrl() {
        return "http://localhost:" + port + "/api/auth";
    }

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        roleRepository.deleteAll();

        roleRepository.save(new Role(null, UserRole.ROLE_USER));
        roleRepository.save(new Role(null, UserRole.ROLE_ADMIN));

        // Register and login Admin user
        RegisterRequest adminRegister = new RegisterRequest();
        adminRegister.setUsername("testadmin");
        adminRegister.setEmail("admin@example.com");
        adminRegister.setPassword("adminpass");
        adminRegister.setRoles(Collections.singleton("admin"));
        restTemplate.postForEntity(getAuthUrl() + "/register", adminRegister, String.class);

        LoginRequest adminLogin = new LoginRequest();
        adminLogin.setUsername("testadmin");
        adminLogin.setPassword("adminpass");
        ResponseEntity<JwtResponse> adminLoginResponse = restTemplate.postForEntity(getAuthUrl() + "/login", adminLogin, JwtResponse.class);
        adminJwt = adminLoginResponse.getBody().getToken();
        adminId = adminLoginResponse.getBody().getId();

        // Register and login regular user
        RegisterRequest userRegister = new RegisterRequest();
        userRegister.setUsername("testuser");
        userRegister.setEmail("user@example.com");
        userRegister.setPassword("userpass");
        userRegister.setRoles(Collections.singleton("user"));
        restTemplate.postForEntity(getAuthUrl() + "/register", userRegister, String.class);

        LoginRequest userLogin = new LoginRequest();
        userLogin.setUsername("testuser");
        userLogin.setPassword("userpass");
        ResponseEntity<JwtResponse> userLoginResponse = restTemplate.postForEntity(getAuthUrl() + "/login", userLogin, JwtResponse.class);
        userJwt = userLoginResponse.getBody().getToken();
        userId = userLoginResponse.getBody().getId();
    }

    private HttpHeaders createAuthHeaders(String jwt) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwt);
        return headers;
    }

    @Test
    void getAllUsers_AdminAccess_ReturnsListOfUsers() {
        HttpHeaders headers = createAuthHeaders(adminJwt);
        ResponseEntity<UserDTO[]> response = restTemplate.exchange(getBaseUrl(), HttpMethod.GET, new HttpEntity<>(headers), UserDTO[].class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().length >= 2); // Admin and regular user
        assertTrue(response.getBody()[0].getUsername().equals("testadmin") || response.getBody()[1].getUsername().equals("testadmin"));
    }

    @Test
    void getAllUsers_UserAccess_ReturnsForbidden() {
        HttpHeaders headers = createAuthHeaders(userJwt);
        ResponseEntity<String> response = restTemplate.exchange(getBaseUrl(), HttpMethod.GET, new HttpEntity<>(headers), String.class);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    void getUserById_AdminAccess_ReturnsUser() {
        HttpHeaders headers = createAuthHeaders(adminJwt);
        ResponseEntity<UserDTO> response = restTemplate.exchange(getBaseUrl() + "/" + userId, HttpMethod.GET, new HttpEntity<>(headers), UserDTO.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(userId, response.getBody().getId());
        assertEquals("testuser", response.getBody().getUsername());
    }

    @Test
    void getUserById_OwnerAccess_ReturnsUser() {
        HttpHeaders headers = createAuthHeaders(userJwt);
        ResponseEntity<UserDTO> response = restTemplate.exchange(getBaseUrl() + "/" + userId, HttpMethod.GET, new HttpEntity<>(headers), UserDTO.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(userId, response.getBody().getId());
        assertEquals("testuser", response.getBody().getUsername());
    }

    @Test
    void getUserById_UnauthorizedUserAccess_ReturnsForbidden() {
        HttpHeaders headers = createAuthHeaders(userJwt);
        // User tries to access admin's profile
        ResponseEntity<String> response = restTemplate.exchange(getBaseUrl() + "/" + adminId, HttpMethod.GET, new HttpEntity<>(headers), String.class);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    void updateUser_AdminUpdatesUser_ReturnsUpdatedUser() {
        UserDTO updatedUser = new UserDTO();
        updatedUser.setUsername("updatedUser");
        updatedUser.setEmail("updated@example.com");

        HttpHeaders headers = createAuthHeaders(adminJwt);
        HttpEntity<UserDTO> requestEntity = new HttpEntity<>(updatedUser, headers);
        ResponseEntity<UserDTO> response = restTemplate.exchange(getBaseUrl() + "/" + userId, HttpMethod.PUT, requestEntity, UserDTO.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("updatedUser", response.getBody().getUsername());
        assertEquals("updated@example.com", response.getBody().getEmail());
    }

    @Test
    void updateUser_UserUpdatesOwnProfile_ReturnsUpdatedUser() {
        UserDTO updatedUser = new UserDTO();
        updatedUser.setUsername("selfUpdatedUser");
        updatedUser.setEmail("selfupdated@example.com");

        HttpHeaders headers = createAuthHeaders(userJwt);
        HttpEntity<UserDTO> requestEntity = new HttpEntity<>(updatedUser, headers);
        ResponseEntity<UserDTO> response = restTemplate.exchange(getBaseUrl() + "/" + userId, HttpMethod.PUT, requestEntity, UserDTO.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("selfUpdatedUser", response.getBody().getUsername());
        assertEquals("selfupdated@example.com", response.getBody().getEmail());
    }

    @Test
    void updateUser_UserUpdatesOtherProfile_ReturnsForbidden() {
        UserDTO updatedUser = new UserDTO();
        updatedUser.setUsername("maliciousUpdate");

        HttpHeaders headers = createAuthHeaders(userJwt);
        HttpEntity<UserDTO> requestEntity = new HttpEntity<>(updatedUser, headers);
        ResponseEntity<String> response = restTemplate.exchange(getBaseUrl() + "/" + adminId, HttpMethod.PUT, requestEntity, String.class);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    void deleteUser_AdminDeletesUser_ReturnsNoContent() {
        HttpHeaders headers = createAuthHeaders(adminJwt);
        ResponseEntity<Void> response = restTemplate.exchange(getBaseUrl() + "/" + userId, HttpMethod.DELETE, new HttpEntity<>(headers), Void.class);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        assertFalse(userRepository.existsById(userId));
    }

    @Test
    void deleteUser_UserDeletesOtherUser_ReturnsForbidden() {
        HttpHeaders headers = createAuthHeaders(userJwt);
        ResponseEntity<String> response = restTemplate.exchange(getBaseUrl() + "/" + adminId, HttpMethod.DELETE, new HttpEntity<>(headers), String.class);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertTrue(userRepository.existsById(adminId));
    }
}