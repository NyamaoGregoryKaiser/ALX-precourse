```java
package com.alx.pms.auth.service;

import com.alx.pms.auth.dto.AuthRequest;
import com.alx.pms.auth.dto.AuthResponse;
import com.alx.pms.exception.UnauthorizedException;
import com.alx.pms.exception.ValidationException;
import com.alx.pms.model.User;
import com.alx.pms.security.JwtService;
import com.alx.pms.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

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

    private AuthRequest registerRequest;
    private AuthRequest loginRequest;
    private User user;

    @BeforeEach
    void setUp() {
        registerRequest = new AuthRequest();
        registerRequest.setUsername("testuser");
        registerRequest.setEmail("test@example.com");
        registerRequest.setPassword("password123");

        loginRequest = new AuthRequest();
        loginRequest.setUsername("testuser");
        loginRequest.setPassword("password123");

        user = new User();
        user.setId(1L);
        user.setUsername("testuser");
        user.setEmail("test@example.com");
        user.setPassword("encodedPassword");
    }

    @Test
    @DisplayName("Should register a new user successfully")
    void register_Success() {
        when(userRepository.existsByUsername(registerRequest.getUsername())).thenReturn(false);
        when(userRepository.existsByEmail(registerRequest.getEmail())).thenReturn(false);
        when(passwordEncoder.encode(registerRequest.getPassword())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(jwtService.generateToken(any(User.class))).thenReturn("mockJwtToken");

        AuthResponse response = authService.register(registerRequest);

        assertNotNull(response);
        assertEquals("mockJwtToken", response.getToken());
        assertEquals("testuser", response.getUsername());
        assertEquals(1L, response.getId());
        assertEquals("Registration successful", response.getMessage());

        verify(userRepository, times(1)).existsByUsername(registerRequest.getUsername());
        verify(userRepository, times(1)).existsByEmail(registerRequest.getEmail());
        verify(passwordEncoder, times(1)).encode(registerRequest.getPassword());
        verify(userRepository, times(1)).save(any(User.class));
        verify(jwtService, times(1)).generateToken(any(User.class));
    }

    @Test
    @DisplayName("Should throw ValidationException if username already exists during registration")
    void register_UsernameAlreadyExists_ThrowsValidationException() {
        when(userRepository.existsByUsername(registerRequest.getUsername())).thenReturn(true);

        ValidationException exception = assertThrows(ValidationException.class, () -> authService.register(registerRequest));
        assertEquals("Username is already taken", exception.getMessage());

        verify(userRepository, times(1)).existsByUsername(registerRequest.getUsername());
        verify(userRepository, never()).existsByEmail(anyString());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw ValidationException if email already exists during registration")
    void register_EmailAlreadyExists_ThrowsValidationException() {
        when(userRepository.existsByUsername(registerRequest.getUsername())).thenReturn(false);
        when(userRepository.existsByEmail(registerRequest.getEmail())).thenReturn(true);

        ValidationException exception = assertThrows(ValidationException.class, () -> authService.register(registerRequest));
        assertEquals("Email is already registered", exception.getMessage());

        verify(userRepository, times(1)).existsByUsername(registerRequest.getUsername());
        verify(userRepository, times(1)).existsByEmail(registerRequest.getEmail());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should log in a user successfully")
    void login_Success() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(null); // Return null for success
        when(userRepository.findByUsername(loginRequest.getUsername())).thenReturn(Optional.of(user));
        when(jwtService.generateToken(user)).thenReturn("mockJwtToken");

        AuthResponse response = authService.login(loginRequest);

        assertNotNull(response);
        assertEquals("mockJwtToken", response.getToken());
        assertEquals("testuser", response.getUsername());
        assertEquals(1L, response.getId());
        assertEquals("Login successful", response.getMessage());

        verify(authenticationManager, times(1)).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(userRepository, times(1)).findByUsername(loginRequest.getUsername());
        verify(jwtService, times(1)).generateToken(user);
    }

    @Test
    @DisplayName("Should throw UnauthorizedException if authentication fails during login")
    void login_AuthenticationFailed_ThrowsUnauthorizedException() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(mock(AuthenticationException.class));

        UnauthorizedException exception = assertThrows(UnauthorizedException.class, () -> authService.login(loginRequest));
        assertEquals("Invalid username or password", exception.getMessage());

        verify(authenticationManager, times(1)).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(userRepository, never()).findByUsername(anyString());
        verify(jwtService, never()).generateToken(any(User.class));
    }

    @Test
    @DisplayName("Should throw UnauthorizedException if user not found after authentication during login")
    void login_UserNotFoundAfterAuth_ThrowsUnauthorizedException() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(null);
        when(userRepository.findByUsername(loginRequest.getUsername())).thenReturn(Optional.empty());

        UnauthorizedException exception = assertThrows(UnauthorizedException.class, () -> authService.login(loginRequest));
        assertEquals("User not found", exception.getMessage());

        verify(authenticationManager, times(1)).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(userRepository, times(1)).findByUsername(loginRequest.getUsername());
        verify(jwtService, never()).generateToken(any(User.class));
    }

    @Test
    @DisplayName("Should not throw exception for logout (stateless operation)")
    void logout_DoesNotThrowException() {
        authService.logout(1L);
        // For JWT, server-side logout is mostly symbolic (e.g., cache eviction if any)
        // We just ensure the method runs without error.
        verifyNoMoreInteractions(userRepository, jwtService, authenticationManager, passwordEncoder);
    }
}
```