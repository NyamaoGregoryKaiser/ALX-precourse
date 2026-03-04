package com.authsystem.auth.service;

import com.authsystem.auth.dto.AuthRequest;
import com.authsystem.auth.dto.AuthResponse;
import com.authsystem.auth.dto.RegisterRequest;
import com.authsystem.auth.util.JwtService;
import com.authsystem.common.exception.ResourceNotFoundException;
import com.authsystem.common.exception.ValidationException;
import com.authsystem.common.util.RoleEnum;
import com.authsystem.model.Role;
import com.authsystem.model.User;
import com.authsystem.repository.RoleRepository;
import com.authsystem.repository.UserRepository;
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
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link AuthService}.
 * This class focuses on testing the business logic for user registration and login,
 * mocking external dependencies like repositories, password encoder, and JWT service.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService Unit Tests")
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

    @InjectMocks
    private AuthService authService;

    private RegisterRequest registerRequest;
    private AuthRequest authRequest;
    private Role userRole;
    private User newUser;
    private User existingUser;

    @BeforeEach
    void setUp() {
        // Setup for registration tests
        registerRequest = RegisterRequest.builder()
                .username("newuser")
                .email("new@example.com")
                .password("Password123!")
                .build();

        userRole = Role.builder().id(1L).name(RoleEnum.ROLE_USER.getRoleName()).createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();

        newUser = User.builder()
                .id(1L)
                .username("newuser")
                .email("new@example.com")
                .password("encodedPassword")
                .enabled(true)
                .accountNonExpired(true)
                .accountNonLocked(true)
                .credentialsNonExpired(true)
                .roles(Set.of(userRole))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        // Setup for login tests
        authRequest = AuthRequest.builder()
                .username("existinguser")
                .password("ExistingPass1!")
                .build();

        existingUser = User.builder()
                .id(2L)
                .username("existinguser")
                .email("existing@example.com")
                .password("encodedExistingPassword")
                .enabled(true)
                .accountNonExpired(true)
                .accountNonLocked(true)
                .credentialsNonExpired(true)
                .roles(Set.of(userRole))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    // --- Register Tests ---
    @Test
    void register_shouldRegisterNewUserSuccessfully() {
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(roleRepository.findByName(RoleEnum.ROLE_USER.getRoleName())).thenReturn(Optional.of(userRole));
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(newUser);
        when(jwtService.generateToken(any(UserDetails.class))).thenReturn("mockJwtToken");

        AuthResponse response = authService.register(registerRequest);

        assertNotNull(response);
        assertEquals("mockJwtToken", response.getToken());
        assertEquals("User registered successfully. Welcome!", response.getMessage());

        verify(userRepository, times(1)).existsByUsername(registerRequest.getUsername());
        verify(userRepository, times(1)).existsByEmail(registerRequest.getEmail());
        verify(roleRepository, times(1)).findByName(RoleEnum.ROLE_USER.getRoleName());
        verify(passwordEncoder, times(1)).encode(registerRequest.getPassword());
        verify(userRepository, times(1)).save(any(User.class));
        verify(jwtService, times(1)).generateToken(any(UserDetails.class));
    }

    @Test
    void register_shouldThrowValidationException_whenUsernameExists() {
        when(userRepository.existsByUsername(anyString())).thenReturn(true);

        ValidationException exception = assertThrows(ValidationException.class, () -> authService.register(registerRequest));
        assertEquals("Username 'newuser' is already taken.", exception.getMessage());
        assertEquals("username_taken", exception.getErrorCode());

        verify(userRepository, times(1)).existsByUsername(registerRequest.getUsername());
        verify(userRepository, never()).existsByEmail(anyString()); // Email check should not be reached
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void register_shouldThrowValidationException_whenEmailExists() {
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(true);

        ValidationException exception = assertThrows(ValidationException.class, () -> authService.register(registerRequest));
        assertEquals("Email 'new@example.com' is already registered.", exception.getMessage());
        assertEquals("email_taken", exception.getErrorCode());

        verify(userRepository, times(1)).existsByUsername(registerRequest.getUsername());
        verify(userRepository, times(1)).existsByEmail(registerRequest.getEmail());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void register_shouldThrowResourceNotFoundException_whenUserRoleNotFound() {
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(roleRepository.findByName(RoleEnum.ROLE_USER.getRoleName())).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> authService.register(registerRequest));
        assertEquals("Default user role not found. Please contact support.", exception.getMessage());
        assertEquals("role_not_found", exception.getErrorCode());

        verify(userRepository, times(1)).existsByUsername(registerRequest.getUsername());
        verify(userRepository, times(1)).existsByEmail(registerRequest.getEmail());
        verify(roleRepository, times(1)).findByName(RoleEnum.ROLE_USER.getRoleName());
        verify(userRepository, never()).save(any(User.class));
    }

    // --- Login Tests ---
    @Test
    void login_shouldAuthenticateUserSuccessfully() {
        Authentication authentication = mock(Authentication.class);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(existingUser); // existingUser implements UserDetails
        when(jwtService.generateToken(any(UserDetails.class))).thenReturn("mockExistingUserJwtToken");

        AuthResponse response = authService.login(authRequest);

        assertNotNull(response);
        assertEquals("mockExistingUserJwtToken", response.getToken());
        assertEquals("Login successful. Welcome back!", response.getMessage());

        verify(authenticationManager, times(1)).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(jwtService, times(1)).generateToken(any(UserDetails.class));
    }

    @Test
    void login_shouldThrowBadCredentialsException_whenAuthenticationFails() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Invalid username or password"));

        BadCredentialsException exception = assertThrows(BadCredentialsException.class, () -> authService.login(authRequest));
        assertEquals("Invalid username or password.", exception.getMessage());

        verify(authenticationManager, times(1)).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(jwtService, never()).generateToken(any(UserDetails.class));
    }

    @Test
    void login_shouldThrowRuntimeException_whenUnexpectedErrorOccurs() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new RuntimeException("Database connection failed"));

        RuntimeException exception = assertThrows(RuntimeException.class, () -> authService.login(authRequest));
        assertEquals("An unexpected error occurred during login. Please try again later.", exception.getMessage());

        verify(authenticationManager, times(1)).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(jwtService, never()).generateToken(any(UserDetails.class));
    }
}