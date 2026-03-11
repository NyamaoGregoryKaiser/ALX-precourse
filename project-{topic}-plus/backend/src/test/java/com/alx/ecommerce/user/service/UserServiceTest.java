package com.alx.ecommerce.user.service;

import com.alx.ecommerce.common.exceptions.InvalidCredentialsException;
import com.alx.ecommerce.common.exceptions.ResourceNotFoundException;
import com.alx.ecommerce.user.dto.LoginRequest;
import com.alx.ecommerce.user.dto.JwtResponse;
import com.alx.ecommerce.user.dto.SignupRequest;
import com.alx.ecommerce.user.dto.UserDTO;
import com.alx.ecommerce.user.model.ERole;
import com.alx.ecommerce.user.model.Role;
import com.alx.ecommerce.user.model.User;
import com.alx.ecommerce.user.repository.RoleRepository;
import com.alx.ecommerce.user.repository.UserRepository;
import com.alx.ecommerce.util.JwtUtil;
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
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private JwtUtil jwtUtil;

    @InjectMocks
    private UserService userService;

    private User user;
    private Role userRole;

    @BeforeEach
    void setUp() {
        userRole = new Role(1, ERole.ROLE_USER);
        Set<Role> roles = new HashSet<>();
        roles.add(userRole);

        user = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .password("encodedPassword")
                .roles(roles)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Should register a new user successfully with default role")
    void registerUser_Success_DefaultRole() {
        SignupRequest signupRequest = new SignupRequest();
        signupRequest.setUsername("newuser");
        signupRequest.setEmail("newuser@example.com");
        signupRequest.setPassword("password123");
        signupRequest.setRole(Collections.emptySet());

        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedNewPassword");
        when(roleRepository.findByName(ERole.ROLE_USER)).thenReturn(Optional.of(userRole));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User savedUser = invocation.getArgument(0);
            savedUser.setId(2L);
            savedUser.setCreatedAt(LocalDateTime.now());
            savedUser.setUpdatedAt(LocalDateTime.now());
            return savedUser;
        });

        UserDTO result = userService.registerUser(signupRequest);

        assertNotNull(result);
        assertEquals("newuser", result.getUsername());
        assertTrue(result.getRoles().contains("ROLE_USER"));
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw exception if username already exists during registration")
    void registerUser_UsernameExists_ThrowsException() {
        SignupRequest signupRequest = new SignupRequest();
        signupRequest.setUsername("testuser");
        signupRequest.setEmail("newuser@example.com");
        signupRequest.setPassword("password123");

        when(userRepository.existsByUsername(anyString())).thenReturn(true);

        assertThrows(InvalidCredentialsException.class, () -> userService.registerUser(signupRequest));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should authenticate user and return JWT response successfully")
    void authenticateUser_Success() {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("testuser");
        loginRequest.setPassword("password123");

        Authentication authentication = mock(Authentication.class);
        UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                user.getUsername(), user.getPassword(),
                user.getRoles().stream().map(r -> new SimpleGrantedAuthority(r.getName().name())).collect(java.util.List::of)
        ) {
            @Override
            public Long getId() { // Simulate CustomUserDetails having ID
                return user.getId();
            }
        };

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userDetails);
        when(jwtUtil.generateJwtToken(authentication)).thenReturn("mockJwtToken");
        when(jwtUtil.getUserNameFromJwtToken("mockJwtToken")).thenReturn(user.getUsername());
        when(userRepository.findByUsername(user.getUsername())).thenReturn(Optional.of(user));

        JwtResponse result = userService.authenticateUser(loginRequest);

        assertNotNull(result);
        assertEquals("mockJwtToken", result.getToken());
        assertEquals(user.getUsername(), result.getUsername());
        assertEquals(user.getId(), result.getId());
        assertTrue(result.getRoles().contains("ROLE_USER"));
    }

    @Test
    @DisplayName("Should throw exception for invalid credentials during authentication")
    void authenticateUser_InvalidCredentials_ThrowsException() {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("testuser");
        loginRequest.setPassword("wrongpassword");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThrows(InvalidCredentialsException.class, () -> userService.authenticateUser(loginRequest));
    }

    @Test
    @DisplayName("Should retrieve user by ID successfully")
    void getUserById_Success() {
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        UserDTO result = userService.getUserById(user.getId());

        assertNotNull(result);
        assertEquals(user.getId(), result.getId());
        assertEquals(user.getUsername(), result.getUsername());
        assertTrue(result.getRoles().contains("ROLE_USER"));
    }

    @Test
    @DisplayName("Should throw exception if user not found by ID")
    void getUserById_NotFound_ThrowsException() {
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.getUserById(99L));
    }
}
```
#### `backend/src/test/java/com/alx/ecommerce/product/service/ProductServiceTest.java` (Unit Test)
```java