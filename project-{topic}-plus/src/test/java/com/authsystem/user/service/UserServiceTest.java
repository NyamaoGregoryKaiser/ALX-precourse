package com.authsystem.user.service;

import com.authsystem.common.exception.ResourceNotFoundException;
import com.authsystem.common.exception.ValidationException;
import com.authsystem.model.Role;
import com.authsystem.model.User;
import com.authsystem.repository.RoleRepository;
import com.authsystem.repository.UserRepository;
import com.authsystem.user.dto.CreateUserRequest;
import com.authsystem.user.dto.UpdateUserRequest;
import com.authsystem.user.dto.UserDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link UserService}.
 * This class focuses on testing the business logic for user management (CRUD),
 * mocking external dependencies like repositories and password encoder.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UserService Unit Tests")
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private User user1;
    private User user2;
    private Role userRole;
    private Role adminRole;

    @BeforeEach
    void setUp() {
        userRole = Role.builder().id(1L).name("ROLE_USER").createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();
        adminRole = Role.builder().id(2L).name("ROLE_ADMIN").createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();

        user1 = User.builder()
                .id(1L)
                .username("testuser1")
                .email("user1@example.com")
                .password("encodedPass1")
                .enabled(true)
                .roles(Set.of(userRole))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        user2 = User.builder()
                .id(2L)
                .username("testuser2")
                .email("user2@example.com")
                .password("encodedPass2")
                .enabled(true)
                .roles(Set.of(adminRole, userRole))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    // --- Get User By ID Tests ---
    @Test
    void getUserById_shouldReturnUserDto_whenUserExists() {
        when(userRepository.findById(anyLong())).thenReturn(Optional.of(user1));

        UserDto result = userService.getUserById(1L);

        assertNotNull(result);
        assertEquals(user1.getId(), result.getId());
        assertEquals(user1.getUsername(), result.getUsername());
        assertTrue(result.getRoles().contains("ROLE_USER"));
        verify(userRepository, times(1)).findById(1L);
    }

    @Test
    void getUserById_shouldThrowResourceNotFoundException_whenUserDoesNotExist() {
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> userService.getUserById(99L));
        assertEquals("User not found with ID: 99", exception.getMessage());
        verify(userRepository, times(1)).findById(99L);
    }

    // --- Get All Users Tests ---
    @Test
    void getAllUsers_shouldReturnPageOfUserDtos() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<User> userPage = new PageImpl<>(List.of(user1, user2), pageable, 2);
        when(userRepository.findAll(any(Pageable.class))).thenReturn(userPage);

        Page<UserDto> result = userService.getAllUsers(pageable);

        assertNotNull(result);
        assertEquals(2, result.getTotalElements());
        assertEquals(user1.getUsername(), result.getContent().get(0).getUsername());
        assertEquals(user2.getUsername(), result.getContent().get(1).getUsername());
        verify(userRepository, times(1)).findAll(pageable);
    }

    @Test
    void getAllUsers_shouldReturnEmptyPage_whenNoUsersExist() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<User> emptyPage = new PageImpl<>(Collections.emptyList(), pageable, 0);
        when(userRepository.findAll(any(Pageable.class))).thenReturn(emptyPage);

        Page<UserDto> result = userService.getAllUsers(pageable);

        assertNotNull(result);
        assertTrue(result.isEmpty());
        assertEquals(0, result.getTotalElements());
        verify(userRepository, times(1)).findAll(pageable);
    }

    // --- Create User Tests ---
    @Test
    void createUser_shouldCreateUserSuccessfully_withRoles() {
        CreateUserRequest request = CreateUserRequest.builder()
                .username("newuser")
                .email("new@example.com")
                .password("NewPass1!")
                .roleNames(Set.of("ROLE_USER"))
                .build();

        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(roleRepository.findByName("ROLE_USER")).thenReturn(Optional.of(userRole));
        when(passwordEncoder.encode(anyString())).thenReturn("encodedNewPass");
        when(userRepository.save(any(User.class))).thenReturn(User.builder().id(3L).username("newuser").email("new@example.com").password("encodedNewPass").roles(Set.of(userRole)).build());

        UserDto result = userService.createUser(request);

        assertNotNull(result);
        assertEquals("newuser", result.getUsername());
        assertEquals("new@example.com", result.getEmail());
        assertTrue(result.getRoles().contains("ROLE_USER"));
        verify(userRepository, times(1)).existsByUsername("newuser");
        verify(userRepository, times(1)).existsByEmail("new@example.com");
        verify(roleRepository, times(1)).findByName("ROLE_USER");
        verify(passwordEncoder, times(1)).encode("NewPass1!");
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void createUser_shouldThrowValidationException_whenUsernameExists() {
        CreateUserRequest request = CreateUserRequest.builder()
                .username("testuser1")
                .email("new@example.com")
                .password("NewPass1!")
                .build();
        when(userRepository.existsByUsername("testuser1")).thenReturn(true);

        ValidationException exception = assertThrows(ValidationException.class, () -> userService.createUser(request));
        assertEquals("Username 'testuser1' is already taken.", exception.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void createUser_shouldThrowResourceNotFoundException_whenRoleNotFound() {
        CreateUserRequest request = CreateUserRequest.builder()
                .username("newuser")
                .email("new@example.com")
                .password("NewPass1!")
                .roleNames(Set.of("NON_EXISTENT_ROLE"))
                .build();
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(roleRepository.findByName("NON_EXISTENT_ROLE")).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> userService.createUser(request));
        assertEquals("Role not found: NON_EXISTENT_ROLE", exception.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    // --- Update User Tests ---
    @Test
    void updateUser_shouldUpdateUserSuccessfully() {
        UpdateUserRequest request = UpdateUserRequest.builder()
                .email("updated@example.com")
                .enabled(false)
                .roleNames(Set.of("ROLE_ADMIN"))
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(user1));
        when(userRepository.existsByEmail(anyString())).thenReturn(false); // Assume no conflict
        when(roleRepository.findByName("ROLE_ADMIN")).thenReturn(Optional.of(adminRole));
        when(userRepository.save(any(User.class))).thenReturn(user2); // Return a modified user

        UserDto result = userService.updateUser(1L, request);

        assertNotNull(result);
        assertEquals("updated@example.com", result.getEmail());
        assertFalse(result.isEnabled());
        assertTrue(result.getRoles().contains("ROLE_ADMIN"));
        assertFalse(result.getRoles().contains("ROLE_USER")); // Original role replaced
        verify(userRepository, times(1)).findById(1L);
        verify(userRepository, times(1)).save(any(User.class));
        verify(roleRepository, times(1)).findByName("ROLE_ADMIN");
    }

    @Test
    void updateUser_shouldThrowValidationException_whenUpdatedEmailExists() {
        UpdateUserRequest request = UpdateUserRequest.builder().email("user2@example.com").build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user1));
        when(userRepository.existsByEmail("user2@example.com")).thenReturn(true);

        ValidationException exception = assertThrows(ValidationException.class, () -> userService.updateUser(1L, request));
        assertEquals("Email 'user2@example.com' is already registered.", exception.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void updateUser_shouldUpdatePassword_whenProvided() {
        UpdateUserRequest request = UpdateUserRequest.builder()
                .password("NewSecurePass1!")
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(user1));
        when(passwordEncoder.encode(anyString())).thenReturn("newEncodedPass");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User userToSave = invocation.getArgument(0);
            assertEquals("newEncodedPass", userToSave.getPassword());
            return userToSave;
        });

        UserDto result = userService.updateUser(1L, request);

        assertNotNull(result);
        verify(passwordEncoder, times(1)).encode("NewSecurePass1!");
        verify(userRepository, times(1)).save(any(User.class));
    }

    // --- Delete User Tests ---
    @Test
    void deleteUser_shouldDeleteUserSuccessfully() {
        when(userRepository.existsById(1L)).thenReturn(true);
        doNothing().when(userRepository).deleteById(1L);

        userService.deleteUser(1L);

        verify(userRepository, times(1)).existsById(1L);
        verify(userRepository, times(1)).deleteById(1L);
    }

    @Test
    void deleteUser_shouldThrowResourceNotFoundException_whenUserDoesNotExist() {
        when(userRepository.existsById(99L)).thenReturn(false);

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> userService.deleteUser(99L));
        assertEquals("User not found with ID: 99", exception.getMessage());
        verify(userRepository, never()).deleteById(anyLong());
    }
}