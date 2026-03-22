package com.alx.auth.system.service;

import com.alx.auth.system.data.dto.AuthenticationRequest;
import com.alx.auth.system.data.dto.AuthenticationResponse;
import com.alx.auth.system.data.dto.RegisterRequest;
import com.alx.auth.system.data.entity.Role;
import com.alx.auth.system.data.entity.User;
import com.alx.auth.system.data.repository.UserRepository;
import com.alx.auth.system.exception.DuplicateUserException;
import com.alx.auth.system.exception.InvalidCredentialsException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link AuthService}.
 * These tests focus on the business logic of authentication and registration,
 * mocking external dependencies like repositories, JWT service, and authentication manager.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService Unit Tests")
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private Authentication authentication; // Mock Spring Security's Authentication object

    @InjectMocks
    private AuthService authService;

    private RegisterRequest registerRequest;
    private AuthenticationRequest authenticationRequest;
    private User user;
    private String encodedPassword = "encodedPassword123";
    private String jwtToken = "mocked.jwt.token";

    @BeforeEach
    void setUp() {
        registerRequest = RegisterRequest.builder()
                .firstname("John")
                .lastname("Doe")
                .email("john.doe@example.com")
                .password("password123")
                .build();

        authenticationRequest = AuthenticationRequest.builder()
                .email("john.doe@example.com")
                .password("password123")
                .build();

        user = User.builder()
                .id(1L)
                .firstname("John")
                .lastname("Doe")
                .email("john.doe@example.com")
                .password(encodedPassword)
                .role(Role.USER)
                .build();
    }

    @Test
    @DisplayName("Should successfully register a new user")
    void register_Success() {
        // Given
        when(userRepository.existsByEmail(registerRequest.getEmail())).thenReturn(false);
        when(passwordEncoder.encode(registerRequest.getPassword())).thenReturn(encodedPassword);
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(jwtService.generateToken(any(User.class))).thenReturn(jwtToken);

        // When
        AuthenticationResponse response = authService.register(registerRequest);

        // Then
        assertNotNull(response);
        assertEquals(jwtToken, response.getToken());
        verify(userRepository, times(1)).existsByEmail(registerRequest.getEmail());
        verify(passwordEncoder, times(1)).encode(registerRequest.getPassword());
        verify(userRepository, times(1)).save(any(User.class));
        verify(jwtService, times(1)).generateToken(any(User.class));
    }

    @Test
    @DisplayName("Should throw DuplicateUserException if email already exists during registration")
    void register_DuplicateEmail_ThrowsException() {
        // Given
        when(userRepository.existsByEmail(registerRequest.getEmail())).thenReturn(true);

        // When & Then
        DuplicateUserException exception = assertThrows(DuplicateUserException.class, () ->
                authService.register(registerRequest));

        assertEquals("User with email " + registerRequest.getEmail() + " already exists.", exception.getMessage());
        verify(userRepository, times(1)).existsByEmail(registerRequest.getEmail());
        verify(passwordEncoder, never()).encode(anyString());
        verify(userRepository, never()).save(any(User.class));
        verify(jwtService, never()).generateToken(any(User.class));
    }

    @Test
    @DisplayName("Should successfully authenticate an existing user")
    void authenticate_Success() {
        // Given
        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                authenticationRequest.getEmail(), authenticationRequest.getPassword());
        when(authenticationManager.authenticate(authToken)).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(user); // Mock UserDetails as principal
        when(jwtService.generateToken(any(User.class))).thenReturn(jwtToken);

        // When
        AuthenticationResponse response = authService.authenticate(authenticationRequest);

        // Then
        assertNotNull(response);
        assertEquals(jwtToken, response.getToken());
        verify(authenticationManager, times(1)).authenticate(authToken);
        verify(jwtService, times(1)).generateToken(any(User.class));
    }

    @Test
    @DisplayName("Should throw InvalidCredentialsException if authentication fails")
    void authenticate_InvalidCredentials_ThrowsException() {
        // Given
        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                authenticationRequest.getEmail(), authenticationRequest.getPassword());
        when(authenticationManager.authenticate(authToken)).thenThrow(new BadCredentialsException("Invalid password"));

        // When & Then
        InvalidCredentialsException exception = assertThrows(InvalidCredentialsException.class, () ->
                authService.authenticate(authenticationRequest));

        assertEquals("Invalid email or password.", exception.getMessage());
        verify(authenticationManager, times(1)).authenticate(authToken);
        verify(jwtService, never()).generateToken(any(User.class));
    }

    @Test
    @DisplayName("Should throw RuntimeException for unexpected errors during authentication")
    void authenticate_UnexpectedError_ThrowsRuntimeException() {
        // Given
        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                authenticationRequest.getEmail(), authenticationRequest.getPassword());
        when(authenticationManager.authenticate(authToken)).thenThrow(new RuntimeException("DB error"));

        // When & Then
        RuntimeException exception = assertThrows(RuntimeException.class, () ->
                authService.authenticate(authenticationRequest));

        assertTrue(exception.getMessage().contains("Authentication failed due to an internal error."));
        verify(authenticationManager, times(1)).authenticate(authToken);
        verify(jwtService, never()).generateToken(any(User.class));
    }
}