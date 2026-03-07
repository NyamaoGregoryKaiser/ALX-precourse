```java
package com.ml.utilities.system.service;

import com.ml.utilities.system.dto.AuthRequest;
import com.ml.utilities.system.dto.AuthResponse;
import com.ml.utilities.system.dto.UserDTO;
import com.ml.utilities.system.exception.InvalidCredentialsException;
import com.ml.utilities.system.exception.UserAlreadyExistsException;
import com.ml.utilities.system.model.Role;
import com.ml.utilities.system.model.User;
import com.ml.utilities.system.repository.RoleRepository;
import com.ml.utilities.system.repository.UserRepository;
import com.ml.utilities.system.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
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

import java.util.Collections;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private Authentication authentication;

    @InjectMocks
    private AuthService authService;

    private UserDTO userDTO;
    private AuthRequest authRequest;
    private User user;
    private Role userRole;

    @BeforeEach
    void setUp() {
        userRole = new Role(1L, "USER", Collections.emptySet());
        user = new User(1L, "testuser", "test@example.com", "encodedPassword", null, null, Set.of(userRole));

        userDTO = new UserDTO(null, "testuser", "test@example.com", "password123", Collections.emptySet());
        authRequest = new AuthRequest("testuser", "password123");

        // Mock common behavior for roleRepository
        when(roleRepository.findByName("USER")).thenReturn(Optional.of(userRole));
    }

    @Test
    void register_Success_WithDefaultRole() {
        when(userRepository.existsByUsername(userDTO.getUsername())).thenReturn(false);
        when(userRepository.existsByEmail(userDTO.getEmail())).thenReturn(false);
        when(passwordEncoder.encode(userDTO.getPassword())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(jwtService.generateToken(user.getUsername())).thenReturn("jwtToken");

        AuthResponse response = authService.register(userDTO);

        assertNotNull(response);
        assertEquals("User registered successfully!", response.getMessage());
        assertEquals("jwtToken", response.getToken());
        verify(userRepository, times(1)).save(any(User.class));
        verify(roleRepository, times(1)).findByName("USER");
    }

    @Test
    void register_UserAlreadyExists_Username() {
        when(userRepository.existsByUsername(userDTO.getUsername())).thenReturn(true);

        UserAlreadyExistsException thrown = assertThrows(UserAlreadyExistsException.class, () -> authService.register(userDTO));

        assertEquals("User with username 'testuser' already exists.", thrown.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void register_UserAlreadyExists_Email() {
        when(userRepository.existsByUsername(userDTO.getUsername())).thenReturn(false);
        when(userRepository.existsByEmail(userDTO.getEmail())).thenReturn(true);

        UserAlreadyExistsException thrown = assertThrows(UserAlreadyExistsException.class, () -> authService.register(userDTO));

        assertEquals("User with email 'test@example.com' already exists.", thrown.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void login_Success() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(jwtService.generateToken(authRequest.getUsername())).thenReturn("jwtToken");

        AuthResponse response = authService.login(authRequest);

        assertNotNull(response);
        assertEquals("Authentication successful!", response.getMessage());
        assertEquals("jwtToken", response.getToken());
        verify(authenticationManager, times(1)).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }

    @Test
    void login_Failure_BadCredentials() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        InvalidCredentialsException thrown = assertThrows(InvalidCredentialsException.class, () -> authService.login(authRequest));

        assertEquals("Invalid username or password.", thrown.getMessage());
        verify(authenticationManager, times(1)).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(jwtService, never()).generateToken(anyString());
    }

    @Test
    void login_Failure_NotAuthenticated() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(false);

        InvalidCredentialsException thrown = assertThrows(InvalidCredentialsException.class, () -> authService.login(authRequest));

        assertEquals("Invalid username or password.", thrown.getMessage());
        verify(authenticationManager, times(1)).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(jwtService, never()).generateToken(anyString());
    }
}
```