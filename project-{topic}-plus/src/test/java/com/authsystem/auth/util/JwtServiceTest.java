package com.authsystem.auth.util;

import com.authsystem.model.Role;
import com.authsystem.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link JwtService}.
 * This class tests the core functionalities of JWT token generation,
 * claim extraction, and token validation.
 *
 * It uses Mockito to inject dependencies and control behavior where necessary,
 * although JwtService itself has minimal external dependencies other than String values.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("JwtService Unit Tests")
class JwtServiceTest {

    @InjectMocks // Inject into JwtService
    private JwtService jwtService;

    // Simulate @Value injection
    private final String TEST_SECRET_KEY = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970"; // 32-byte (256-bit) base64 encoded
    private final long TEST_EXPIRATION = 1000 * 60 * 5; // 5 minutes

    private User testUser;
    private Role userRole;

    @BeforeEach
    void setUp() {
        // Manually inject values as @Value doesn't work in pure unit tests without Spring context
        ReflectionTestUtils.setField(jwtService, "secretKey", TEST_SECRET_KEY);
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", TEST_EXPIRATION);
        jwtService.init(); // Manually call init to set up the signing key

        userRole = Role.builder().id(1L).name("ROLE_USER").build();
        Set<Role> roles = new HashSet<>();
        roles.add(userRole);

        testUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .password("encodedPassword") // Hashed password is not relevant for JWT generation/validation itself
                .enabled(true)
                .accountNonExpired(true)
                .accountNonLocked(true)
                .credentialsNonExpired(true)
                .roles(roles)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    void init_shouldInitializeSigningKey() {
        assertNotNull(ReflectionTestUtils.getField(jwtService, "signingKey"));
    }

    @Test
    void generateToken_shouldReturnValidToken() {
        String token = jwtService.generateToken(testUser);
        assertNotNull(token);
        assertFalse(token.isEmpty());
        assertTrue(token.split("\\.").length == 3); // JWTs have 3 parts
    }

    @Test
    void extractUsername_shouldReturnCorrectUsername() {
        String token = jwtService.generateToken(testUser);
        String extractedUsername = jwtService.extractUsername(token);
        assertEquals(testUser.getUsername(), extractedUsername);
    }

    @Test
    void extractExpiration_shouldReturnCorrectExpirationDate() {
        String token = jwtService.generateToken(testUser);
        Date expiration = jwtService.extractClaim(token, Claims::getExpiration);

        assertNotNull(expiration);
        // Ensure expiration is roughly TEST_EXPIRATION milliseconds from now
        long expectedExpirationTime = System.currentTimeMillis() + TEST_EXPIRATION;
        assertTrue(expiration.getTime() <= expectedExpirationTime + 1000); // Allow for small time discrepancies
        assertTrue(expiration.getTime() >= expectedExpirationTime - 1000); // Allow for small time discrepancies
    }

    @Test
    void isTokenValid_shouldReturnTrueForValidTokenAndUser() {
        String token = jwtService.generateToken(testUser);
        assertTrue(jwtService.isTokenValid(token, testUser));
    }

    @Test
    void isTokenValid_shouldReturnFalseForExpiredToken() throws InterruptedException {
        // Temporarily set a very short expiration for this test
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", 100L); // 100 milliseconds
        jwtService.init(); // Re-initialize with new expiration

        String token = jwtService.generateToken(testUser);
        Thread.sleep(150); // Wait for token to expire

        assertFalse(jwtService.isTokenValid(token, testUser));

        // Reset to original expiration for other tests
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", TEST_EXPIRATION);
        jwtService.init();
    }

    @Test
    void isTokenValid_shouldReturnFalseForDifferentUser() {
        String token = jwtService.generateToken(testUser);

        User anotherUser = User.builder()
                .username("anotheruser")
                .email("another@example.com")
                .password("encodedPassword")
                .build();

        assertFalse(jwtService.isTokenValid(token, anotherUser));
    }

    @Test
    void extractAllClaims_shouldContainRoles() {
        String token = jwtService.generateToken(testUser);
        Claims claims = jwtService.extractClaim(token, Function.identity()); // Extract all claims

        assertNotNull(claims);
        assertTrue(claims.containsKey("roles"));
        List<String> roles = claims.get("roles", List.class);
        assertNotNull(roles);
        assertFalse(roles.isEmpty());
        assertTrue(roles.contains(userRole.getName()));
    }

    @Test
    void generateToken_withEmptyExtraClaims_shouldWork() {
        String token = jwtService.generateToken(new HashMap<>(), testUser);
        assertNotNull(token);
        assertFalse(token.isEmpty());
    }
}