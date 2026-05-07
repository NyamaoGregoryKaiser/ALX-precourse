package com.appinsight.appinsight.util;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.SignatureException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collections;
import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class JwtUtilTest {

    private JwtUtil jwtUtil;
    private UserDetails userDetails;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        // Set secret key and expiration time via reflection for testing
        ReflectionTestUtils.setField(jwtUtil, "SECRET_KEY", "thisisalongandsecuresecretkeyforjwttestingthatismorethan256bitslong");
        ReflectionTestUtils.setField(jwtUtil, "EXPIRATION_TIME", 3600000L); // 1 hour

        List<GrantedAuthority> authorities = Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"));
        userDetails = new User("testuser", "password", authorities);
    }

    @Test
    @DisplayName("Should generate a valid JWT token")
    void generateToken_shouldReturnValidToken() {
        String token = jwtUtil.generateToken(userDetails);
        assertNotNull(token);
        assertFalse(token.isEmpty());
    }

    @Test
    @DisplayName("Should extract username correctly from token")
    void extractUsername_shouldReturnCorrectUsername() {
        String token = jwtUtil.generateToken(userDetails);
        String username = jwtUtil.extractUsername(token);
        assertThat(username).isEqualTo(userDetails.getUsername());
    }

    @Test
    @DisplayName("Should extract expiration date correctly from token")
    void extractExpiration_shouldReturnCorrectExpiration() {
        String token = jwtUtil.generateToken(userDetails);
        Date expiration = jwtUtil.extractExpiration(token);
        assertNotNull(expiration);
        assertTrue(expiration.after(new Date())); // Should not be expired immediately
    }

    @Test
    @DisplayName("Should validate a valid token")
    void validateToken_shouldReturnTrue_forValidToken() {
        String token = jwtUtil.generateToken(userDetails);
        assertTrue(jwtUtil.validateToken(token, userDetails));
    }

    @Test
    @DisplayName("Should invalidate a token with incorrect username")
    void validateToken_shouldReturnFalse_forIncorrectUsername() {
        String token = jwtUtil.generateToken(userDetails);
        UserDetails otherUser = new User("otheruser", "password", Collections.emptyList());
        assertFalse(jwtUtil.validateToken(token, otherUser));
    }

    @Test
    @DisplayName("Should invalidate an expired token")
    void validateToken_shouldReturnFalse_forExpiredToken() {
        ReflectionTestUtils.setField(jwtUtil, "EXPIRATION_TIME", 1L); // 1ms expiration for testing
        String token = jwtUtil.generateToken(userDetails);
        try {
            Thread.sleep(10); // Wait for token to expire
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        assertThrows(ExpiredJwtException.class, () -> jwtUtil.validateToken(token, userDetails));
    }

    @Test
    @DisplayName("Should invalidate a token with a tampered signature")
    void validateToken_shouldReturnFalse_forTamperedToken() {
        String validToken = jwtUtil.generateToken(userDetails);
        // Tamper with the token (e.g., change a character in the payload)
        String tamperedToken = validToken.substring(0, validToken.length() - 5) + "AAAAA";
        assertThrows(SignatureException.class, () -> jwtUtil.validateToken(tamperedToken, userDetails));
    }

    @Test
    @DisplayName("Should invalidate a malformed token")
    void validateToken_shouldReturnFalse_forMalformedToken() {
        String malformedToken = "invalid.jwt.token";
        assertThrows(MalformedJwtException.class, () -> jwtUtil.validateToken(malformedToken, userDetails));
    }
}