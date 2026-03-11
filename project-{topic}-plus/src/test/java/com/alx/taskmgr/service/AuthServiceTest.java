```java
package com.alx.taskmgr.service;

import com.alx.taskmgr.dto.auth.AuthRequest;
import com.alx.taskmgr.dto.auth.AuthResponse;
import com.alx.taskmgr.dto.auth.RegisterRequest;
import com.alx.taskmgr.entity.Role;
import com.alx.taskmgr.entity.User;
import com.alx.taskmgr.exception.DuplicateResourceException;
import com.alx.taskmgr.repository.UserRepository;
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
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link AuthService} using Mockito.
 * Focuses on testing the business logic of authentication and registration
 * by mocking external dependencies like repositories and security components.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;
    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest registerRequest;
    private AuthRequest authRequest;
    private User testUser;
    private String hashedPassword;
    private String jwtToken;

    @BeforeEach
    void setUp() {
        // Initialize common test data
        registerRequest = RegisterRequest.builder()
                .fullName("Test User")
                .email("test@example.com")
                .password("password123")
                .build();

        authRequest = AuthRequest.builder()
                .email("test@example.com")
                .password("password123")
                .build();

        hashedPassword = "hashedPassword123";
        jwtToken = "jwt.token.string";

        testUser = User.builder()
                .id(1L)
                .fullName("Test User")
                .email("test@example.com")
                .password(hashedPassword)
                .roles(Set.of(Role.ROLE_USER))
                .build();
    }

    @Test
    @DisplayName("Should successfully register a new user")
    void register_Success() {
        // Given
        when(userRepository.existsByEmail(registerRequest.getEmail())).thenReturn(false);
        when(passwordEncoder.encode(registerRequest.getPassword())).thenReturn(hashedPassword);
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(jwtService.generateToken(any(User.class))).thenReturn(jwtToken);

        // When
        AuthResponse response = authService.register(registerRequest);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo(jwtToken);
        verify(userRepository, times(1)).existsByEmail(registerRequest.getEmail());
        verify(passwordEncoder, times(1)).encode(registerRequest.getPassword());
        verify(userRepository, times(1)).save(any(User.class));
        verify(jwtService, times(1)).generateToken(any(User.class));
    }

    @Test
    @DisplayName("Should throw DuplicateResourceException if email already exists during registration")
    void register_DuplicateEmail_ThrowsException() {
        // Given
        when(userRepository.existsByEmail(registerRequest.getEmail())).thenReturn(true);

        // When & Then
        DuplicateResourceException exception = assertThrows(DuplicateResourceException.class,
                () -> authService.register(registerRequest));

        assertThat(exception.getMessage()).contains("already exists");
        verify(userRepository, times(1)).existsByEmail(registerRequest.getEmail());
        verify(passwordEncoder, never()).encode(anyString());
        verify(userRepository, never()).save(any(User.class));
        verify(jwtService, never()).generateToken(any(User.class));
    }

    @Test
    @DisplayName("Should successfully authenticate an existing user")
    void authenticate_Success() {
        // Given
        when(authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(authRequest.getEmail(), authRequest.getPassword())
        )).thenReturn(null); // authenticationManager.authenticate() usually returns Authentication,
                             // but we only care it doesn't throw for success path.
        when(userRepository.findByEmail(authRequest.getEmail())).thenReturn(Optional.of(testUser));
        when(jwtService.generateToken(any(User.class))).thenReturn(jwtToken);

        // When
        AuthResponse response = authService.authenticate(authRequest);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo(jwtToken);
        verify(authenticationManager, times(1)).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(userRepository, times(1)).findByEmail(authRequest.getEmail());
        verify(jwtService, times(1)).generateToken(any(User.class));
    }

    @Test
    @DisplayName("Should throw BadCredentialsException on authentication failure")
    void authenticate_Failure_ThrowsBadCredentialsException() {
        // Given
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Invalid credentials"));

        // When & Then
        BadCredentialsException exception = assertThrows(BadCredentialsException.class,
                () -> authService.authenticate(authRequest));

        assertThat(exception.getMessage()).contains("Invalid credentials");
        verify(authenticationManager, times(1)).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(userRepository, never()).findByEmail(anyString());
        verify(jwtService, never()).generateToken(any(User.class));
    }

    @Test
    @DisplayName("Should throw BadCredentialsException if user not found after authentication success (edge case)")
    void authenticate_UserNotFoundAfterAuth_ThrowsBadCredentialsException() {
        // Given
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(null); // Mimic successful authentication
        when(userRepository.findByEmail(authRequest.getEmail())).thenReturn(Optional.empty());

        // When & Then
        BadCredentialsException exception = assertThrows(BadCredentialsException.class,
                () -> authService.authenticate(authRequest));

        assertThat(exception.getMessage()).contains("User not found after authentication success");
        verify(authenticationManager, times(1)).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(userRepository, times(1)).findByEmail(authRequest.getEmail());
        verify(jwtService, never()).generateToken(any(User.class));
    }
}
```