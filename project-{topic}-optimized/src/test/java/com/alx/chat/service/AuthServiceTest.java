```java
package com.alx.chat.service;

import com.alx.chat.dto.AuthResponse;
import com.alx.chat.dto.LoginRequest;
import com.alx.chat.dto.RegisterRequest;
import com.alx.chat.entity.User;
import com.alx.chat.exception.BadRequestException;
import com.alx.chat.jwt.JwtUtils;
import com.alx.chat.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtils jwtUtils;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;
    private User testUser;
    private UserDetailsImpl userDetails;

    @BeforeEach
    void setUp() {
        registerRequest = new RegisterRequest();
        registerRequest.setUsername("testuser");
        registerRequest.setEmail("test@example.com");
        registerRequest.setPassword("password123");
        registerRequest.setRoles(Set.of("user"));

        loginRequest = new LoginRequest();
        loginRequest.setUsernameOrEmail("testuser");
        loginRequest.setPassword("password123");

        testUser = new User(1L, "testuser", "test@example.com", "encodedPassword", null, null, Set.of("ROLE_USER"), null, null);
        userDetails = UserDetailsImpl.build(testUser);
    }

    @Test
    void registerUser_success() {
        when(userRepository.existsByUsername(registerRequest.getUsername())).thenReturn(false);
        when(userRepository.existsByEmail(registerRequest.getEmail())).thenReturn(false);
        when(passwordEncoder.encode(registerRequest.getPassword())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        User savedUser = authService.registerUser(registerRequest);

        assertNotNull(savedUser);
        assertEquals("testuser", savedUser.getUsername());
        assertEquals("test@example.com", savedUser.getEmail());
        assertTrue(savedUser.getRoles().contains("ROLE_USER"));
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void registerUser_usernameAlreadyTaken() {
        when(userRepository.existsByUsername(registerRequest.getUsername())).thenReturn(true);

        BadRequestException exception = assertThrows(BadRequestException.class, () -> authService.registerUser(registerRequest));
        assertEquals("Username is already taken!", exception.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void registerUser_emailAlreadyInUse() {
        when(userRepository.existsByUsername(registerRequest.getUsername())).thenReturn(false);
        when(userRepository.existsByEmail(registerRequest.getEmail())).thenReturn(true);

        BadRequestException exception = assertThrows(BadRequestException.class, () -> authService.registerUser(registerRequest));
        assertEquals("Email is already in use!", exception.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void authenticateUser_success() {
        Authentication authentication = mock(Authentication.class);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userDetails);
        when(authentication.getAuthorities()).thenReturn(Collections.singleton(new SimpleGrantedAuthority("ROLE_USER")));
        when(jwtUtils.generateJwtToken(authentication)).thenReturn("dummyJwtToken");

        AuthResponse response = authService.authenticateUser(loginRequest);

        assertNotNull(response);
        assertEquals("dummyJwtToken", response.getToken());
        assertEquals("testuser", response.getUsername());
        assertTrue(response.getRoles().contains("ROLE_USER"));
        verify(authenticationManager, times(1)).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(jwtUtils, times(1)).generateJwtToken(authentication);
    }

    @Test
    void authenticateUser_badCredentials() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new org.springframework.security.authentication.BadCredentialsException("Invalid credentials"));

        assertThrows(org.springframework.security.authentication.BadCredentialsException.class, () -> authService.authenticateUser(loginRequest));
        verify(jwtUtils, never()).generateJwtToken(any(Authentication.class));
    }
}
```