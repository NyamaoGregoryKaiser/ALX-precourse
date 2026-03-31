```java
package com.ml_utils_system.service;

import com.ml_utils_system.config.JwtUtils;
import com.ml_utils_system.dto.AuthResponseDto;
import com.ml_utils_system.dto.LoginRequestDto;
import com.ml_utils_system.dto.RegisterRequestDto;
import com.ml_utils_system.exception.ValidationException;
import com.ml_utils_system.model.ERole;
import com.ml_utils_system.model.Role;
import com.ml_utils_system.model.User;
import com.ml_utils_system.repository.RoleRepository;
import com.ml_utils_system.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link AuthService} using Mockito.
 * Focuses on testing the business logic of authentication and registration
 * without involving the actual database or full Spring context.
 */
@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder encoder;

    @Mock
    private JwtUtils jwtUtils;

    @InjectMocks
    private AuthService authService;

    private User testUser;
    private Role userRole;
    private Role adminRole;

    @BeforeEach
    void setUp() {
        userRole = new Role(1L, ERole.ROLE_USER);
        adminRole = new Role(2L, ERole.ROLE_ADMIN);

        Set<Role> roles = new HashSet<>();
        roles.add(userRole);
        roles.add(adminRole);

        testUser = new User(1L, "testuser", "encodedPassword", "test@example.com", roles, LocalDateTime.now(), LocalDateTime.now());
    }

    @Test
    @DisplayName("Should authenticate user and return JWT token")
    void authenticateUser_success() {
        LoginRequestDto loginRequest = new LoginRequestDto();
        loginRequest.setUsername("testuser");
        loginRequest.setPassword("password");

        Authentication authentication = new UsernamePasswordAuthenticationToken(testUser, null, testUser.getAuthorities());

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(authentication);
        when(jwtUtils.generateJwtToken(authentication)).thenReturn("mockJwtToken");

        AuthResponseDto response = authService.authenticateUser(loginRequest);

        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("mockJwtToken");
        assertThat(response.getUsername()).isEqualTo("testuser");
        assertThat(response.getRoles()).containsExactlyInAnyOrder("ROLE_USER", "ROLE_ADMIN");

        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(jwtUtils).generateJwtToken(authentication);
    }

    @Test
    @DisplayName("Should register new user with default ROLE_USER")
    void registerUser_defaultRole_success() {
        RegisterRequestDto registerRequest = new RegisterRequestDto();
        registerRequest.setUsername("newuser");
        registerRequest.setEmail("newuser@example.com");
        registerRequest.setPassword("newpassword");
        registerRequest.setRoles(Collections.emptySet()); // No roles specified

        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(encoder.encode(anyString())).thenReturn("encodedNewPassword");
        when(roleRepository.findByName(ERole.ROLE_USER)).thenReturn(Optional.of(userRole));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(2L); // Simulate ID generation
            return user;
        });

        User registeredUser = authService.registerUser(registerRequest);

        assertThat(registeredUser).isNotNull();
        assertThat(registeredUser.getUsername()).isEqualTo("newuser");
        assertThat(registeredUser.getRoles()).containsOnly(userRole);

        verify(userRepository).existsByUsername("newuser");
        verify(userRepository).existsByEmail("newuser@example.com");
        verify(encoder).encode("newpassword");
        verify(roleRepository).findByName(ERole.ROLE_USER);
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("Should register new user with specified ADMIN role")
    void registerUser_adminRole_success() {
        RegisterRequestDto registerRequest = new RegisterRequestDto();
        registerRequest.setUsername("adminuser");
        registerRequest.setEmail("adminuser@example.com");
        registerRequest.setPassword("adminpassword");
        registerRequest.setRoles(Collections.singleton("admin"));

        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(encoder.encode(anyString())).thenReturn("encodedAdminPassword");
        when(roleRepository.findByName(ERole.ROLE_ADMIN)).thenReturn(Optional.of(adminRole));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(3L);
            return user;
        });

        User registeredUser = authService.registerUser(registerRequest);

        assertThat(registeredUser).isNotNull();
        assertThat(registeredUser.getUsername()).isEqualTo("adminuser");
        assertThat(registeredUser.getRoles()).containsOnly(adminRole);

        verify(userRepository).existsByUsername("adminuser");
        verify(userRepository).existsByEmail("adminuser@example.com");
        verify(encoder).encode("adminpassword");
        verify(roleRepository).findByName(ERole.ROLE_ADMIN);
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw ValidationException if username is already taken during registration")
    void registerUser_usernameTaken_throwsException() {
        RegisterRequestDto registerRequest = new RegisterRequestDto();
        registerRequest.setUsername("testuser");
        registerRequest.setEmail("unique@example.com");
        registerRequest.setPassword("password");

        when(userRepository.existsByUsername("testuser")).thenReturn(true);

        ValidationException exception = assertThrows(ValidationException.class, () -> authService.registerUser(registerRequest));
        assertThat(exception.getMessage()).isEqualTo("Error: Username is already taken!");

        verify(userRepository).existsByUsername("testuser");
        verify(userRepository).existsByEmail("unique@example.com"); // Still checks email after username
    }

    @Test
    @DisplayName("Should throw ValidationException if email is already in use during registration")
    void registerUser_emailInUse_throwsException() {
        RegisterRequestDto registerRequest = new RegisterRequestDto();
        registerRequest.setUsername("anotheruser");
        registerRequest.setEmail("test@example.com");
        registerRequest.setPassword("password");

        when(userRepository.existsByUsername("anotheruser")).thenReturn(false);
        when(userRepository.existsByEmail("test@example.com")).thenReturn(true);

        ValidationException exception = assertThrows(ValidationException.class, () -> authService.registerUser(registerRequest));
        assertThat(exception.getMessage()).isEqualTo("Error: Email is already in use!");

        verify(userRepository).existsByUsername("anotheruser");
        verify(userRepository).existsByEmail("test@example.com");
    }

    @Test
    @DisplayName("Should throw ValidationException if a specified role is not found")
    void registerUser_roleNotFound_throwsException() {
        RegisterRequestDto registerRequest = new RegisterRequestDto();
        registerRequest.setUsername("newuser");
        registerRequest.setEmail("newuser@example.com");
        registerRequest.setPassword("newpassword");
        registerRequest.setRoles(Collections.singleton("nonexistent_role")); // Invalid role

        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(roleRepository.findByName(any(ERole.class))).thenReturn(Optional.empty()); // Simulate role not found

        ValidationException exception = assertThrows(ValidationException.class, () -> authService.registerUser(registerRequest));
        assertThat(exception.getMessage()).isEqualTo("Error: Role is not found.");

        verify(userRepository).existsByUsername("newuser");
        verify(userRepository).existsByEmail("newuser@example.com");
        verify(roleRepository).findByName(any(ERole.class));
    }
}
```