```java
package com.alx.vizflow.service;

import com.alx.vizflow.dto.UserRegistrationRequest;
import com.alx.vizflow.exception.ResourceNotFoundException;
import com.alx.vizflow.exception.UserAlreadyExistsException;
import com.alx.vizflow.model.Role;
import com.alx.vizflow.model.User;
import com.alx.vizflow.repository.RoleRepository;
import com.alx.vizflow.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("User Service Unit Tests")
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private UserRegistrationRequest registrationRequest;
    private User testUser;
    private Role userRole;

    @BeforeEach
    void setUp() {
        registrationRequest = new UserRegistrationRequest();
        registrationRequest.setUsername("testuser");
        registrationRequest.setEmail("test@example.com");
        registrationRequest.setPassword("password123");

        userRole = new Role(1L, Role.RoleName.ROLE_USER);
        Set<Role> roles = new HashSet<>(Collections.singletonList(userRole));

        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPassword("encodedPassword");
        testUser.setRoles(roles);
    }

    @Test
    void testRegisterNewUser_Success() {
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
        when(roleRepository.findByName(Role.RoleName.ROLE_USER)).thenReturn(Optional.of(userRole));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        User createdUser = userService.registerNewUser(registrationRequest);

        assertNotNull(createdUser);
        assertEquals(testUser.getUsername(), createdUser.getUsername());
        assertEquals("encodedPassword", createdUser.getPassword());
        assertTrue(createdUser.getRoles().contains(userRole));

        verify(userRepository, times(1)).existsByUsername(registrationRequest.getUsername());
        verify(userRepository, times(1)).existsByEmail(registrationRequest.getEmail());
        verify(passwordEncoder, times(1)).encode(registrationRequest.getPassword());
        verify(roleRepository, times(1)).findByName(Role.RoleName.ROLE_USER);
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void testRegisterNewUser_UsernameExists() {
        when(userRepository.existsByUsername(anyString())).thenReturn(true);

        UserAlreadyExistsException thrown = assertThrows(UserAlreadyExistsException.class, () ->
                userService.registerNewUser(registrationRequest));

        assertEquals("Username testuser already taken.", thrown.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testGetUserById_Success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        User foundUser = userService.getUserById(1L);

        assertNotNull(foundUser);
        assertEquals(testUser.getUsername(), foundUser.getUsername());
        verify(userRepository, times(1)).findById(1L);
    }

    @Test
    void testGetUserById_NotFound() {
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());

        ResourceNotFoundException thrown = assertThrows(ResourceNotFoundException.class, () ->
                userService.getUserById(99L));

        assertEquals("User not found with id: 99", thrown.getMessage());
        verify(userRepository, times(1)).findById(99L);
    }

    // Add more unit tests for other UserService methods (update, delete, findByUsername, getAllUsers)
    // and for edge cases/error conditions
}
```