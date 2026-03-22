package com.alx.auth.system.service;

import com.alx.auth.system.data.dto.UpdateUserRequest;
import com.alx.auth.system.data.dto.UserResponse;
import com.alx.auth.system.data.entity.Role;
import com.alx.auth.system.data.entity.User;
import com.alx.auth.system.data.repository.UserRepository;
import com.alx.auth.system.exception.UserNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link UserService}.
 * These tests focus on the business logic for user management (retrieve, update, delete),
 * mocking interactions with the UserRepository and PasswordEncoder.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UserService Unit Tests")
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private User testUser;
    private User adminUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .firstname("John")
                .lastname("Doe")
                .email("john.doe@example.com")
                .password("encodedPassword")
                .role(Role.USER)
                .build();

        adminUser = User.builder()
                .id(2L)
                .firstname("Admin")
                .lastname("User")
                .email("admin@example.com")
                .password("adminEncodedPassword")
                .role(Role.ADMIN)
                .build();
    }

    @Test
    @DisplayName("Should find a user by email and return UserResponse")
    void findUserByEmail_UserExists_ReturnsUserResponse() {
        // Given
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));

        // When
        UserResponse response = userService.findUserByEmail(testUser.getEmail());

        // Then
        assertNotNull(response);
        assertEquals(testUser.getEmail(), response.getEmail());
        assertEquals(testUser.getFirstname(), response.getFirstname());
        verify(userRepository, times(1)).findByEmail(testUser.getEmail());
    }

    @Test
    @DisplayName("Should throw UserNotFoundException when user email does not exist")
    void findUserByEmail_UserNotExists_ThrowsException() {
        // Given
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());

        // When & Then
        UserNotFoundException exception = assertThrows(UserNotFoundException.class, () ->
                userService.findUserByEmail("nonexistent@example.com"));

        assertEquals("User with email nonexistent@example.com not found.", exception.getMessage());
        verify(userRepository, times(1)).findByEmail(anyString());
    }

    @Test
    @DisplayName("Should find a user by ID and return UserResponse")
    void findUserById_UserExists_ReturnsUserResponse() {
        // Given
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));

        // When
        UserResponse response = userService.findUserById(testUser.getId());

        // Then
        assertNotNull(response);
        assertEquals(testUser.getId(), response.getId());
        assertEquals(testUser.getEmail(), response.getEmail());
        verify(userRepository, times(1)).findById(testUser.getId());
    }

    @Test
    @DisplayName("Should throw UserNotFoundException when user ID does not exist")
    void findUserById_UserNotExists_ThrowsException() {
        // Given
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());

        // When & Then
        UserNotFoundException exception = assertThrows(UserNotFoundException.class, () ->
                userService.findUserById(99L));

        assertEquals("User with ID 99 not found.", exception.getMessage());
        verify(userRepository, times(1)).findById(anyLong());
    }

    @Test
    @DisplayName("Should find all users and return a list of UserResponse")
    void findAllUsers_ReturnsListOfUserResponse() {
        // Given
        List<User> users = List.of(testUser, adminUser);
        when(userRepository.findAll()).thenReturn(users);

        // When
        List<UserResponse> responses = userService.findAllUsers();

        // Then
        assertNotNull(responses);
        assertEquals(2, responses.size());
        assertEquals(testUser.getEmail(), responses.get(0).getEmail());
        assertEquals(adminUser.getEmail(), responses.get(1).getEmail());
        verify(userRepository, times(1)).findAll();
    }

    @Test
    @DisplayName("Should update user's first name, last name, and password")
    void updateUser_AllFieldsUpdated_ReturnsUpdatedUserResponse() {
        // Given
        UpdateUserRequest updateRequest = UpdateUserRequest.builder()
                .firstname("Jonathan")
                .lastname("Smith")
                .newPassword("newPass123")
                .build();
        User updatedUserEntity = User.builder()
                .id(testUser.getId())
                .firstname(updateRequest.getFirstname())
                .lastname(updateRequest.getLastname())
                .email(testUser.getEmail())
                .password("newEncodedPassword") // Simulating new encoded password
                .role(testUser.getRole())
                .build();

        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches(updateRequest.getNewPassword(), testUser.getPassword())).thenReturn(false); // Old password doesn't match new one
        when(passwordEncoder.encode(updateRequest.getNewPassword())).thenReturn("newEncodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(updatedUserEntity);

        // When
        UserResponse response = userService.updateUser(testUser.getEmail(), updateRequest);

        // Then
        assertNotNull(response);
        assertEquals("Jonathan", response.getFirstname());
        assertEquals("Smith", response.getLastname());
        verify(userRepository, times(1)).findByEmail(testUser.getEmail());
        verify(passwordEncoder, times(1)).matches(updateRequest.getNewPassword(), testUser.getPassword());
        verify(passwordEncoder, times(1)).encode(updateRequest.getNewPassword());
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("Should only update specified fields (e.g., only first name)")
    void updateUser_PartialUpdate_ReturnsUpdatedUserResponse() {
        // Given
        UpdateUserRequest updateRequest = UpdateUserRequest.builder()
                .firstname("Jane")
                .build();
        User partiallyUpdatedUser = User.builder()
                .id(testUser.getId())
                .firstname(updateRequest.getFirstname())
                .lastname(testUser.getLastname())
                .email(testUser.getEmail())
                .password(testUser.getPassword())
                .role(testUser.getRole())
                .build();

        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(partiallyUpdatedUser);

        // When
        UserResponse response = userService.updateUser(testUser.getEmail(), updateRequest);

        // Then
        assertNotNull(response);
        assertEquals("Jane", response.getFirstname());
        assertEquals(testUser.getLastname(), response.getLastname()); // Last name should be unchanged
        verify(userRepository, times(1)).findByEmail(testUser.getEmail());
        verify(userRepository, times(1)).save(any(User.class));
        verify(passwordEncoder, never()).encode(anyString()); // Password encoder not called for password update
    }

    @Test
    @DisplayName("Should return original user if no changes requested")
    void updateUser_NoChanges_ReturnsOriginalUserResponse() {
        // Given
        UpdateUserRequest updateRequest = UpdateUserRequest.builder()
                .firstname(testUser.getFirstname()) // Same first name
                .lastname(testUser.getLastname())   // Same last name
                // No new password
                .build();

        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));

        // When
        UserResponse response = userService.updateUser(testUser.getEmail(), updateRequest);

        // Then
        assertNotNull(response);
        assertEquals(testUser.getFirstname(), response.getFirstname());
        assertEquals(testUser.getLastname(), response.getLastname());
        verify(userRepository, times(1)).findByEmail(testUser.getEmail());
        verify(userRepository, never()).save(any(User.class)); // save should not be called if no changes
    }

    @Test
    @DisplayName("Should throw UserNotFoundException when updating a non-existent user")
    void updateUser_UserNotExists_ThrowsException() {
        // Given
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        UpdateUserRequest updateRequest = UpdateUserRequest.builder().firstname("New").build();

        // When & Then
        UserNotFoundException exception = assertThrows(UserNotFoundException.class, () ->
                userService.updateUser("nonexistent@example.com", updateRequest));

        assertEquals("User with email nonexistent@example.com not found.", exception.getMessage());
        verify(userRepository, times(1)).findByEmail(anyString());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should successfully delete a user by ID")
    void deleteUser_UserExists_DeletesUser() {
        // Given
        when(userRepository.existsById(testUser.getId())).thenReturn(true);
        doNothing().when(userRepository).deleteById(testUser.getId());

        // When
        userService.deleteUser(testUser.getId());

        // Then
        verify(userRepository, times(1)).existsById(testUser.getId());
        verify(userRepository, times(1)).deleteById(testUser.getId());
    }

    @Test
    @DisplayName("Should throw UserNotFoundException when deleting a non-existent user")
    void deleteUser_UserNotExists_ThrowsException() {
        // Given
        when(userRepository.existsById(anyLong())).thenReturn(false);

        // When & Then
        UserNotFoundException exception = assertThrows(UserNotFoundException.class, () ->
                userService.deleteUser(99L));

        assertEquals("User with ID 99 not found.", exception.getMessage());
        verify(userRepository, times(1)).existsById(anyLong());
        verify(userRepository, never()).deleteById(anyLong());
    }
}