```java
package com.alxmobilebackend.service;

import com.alxmobilebackend.dto.UserDto;
import com.alxmobilebackend.exception.ResourceNotFoundException;
import com.alxmobilebackend.exception.ValidationException;
import com.alxmobilebackend.model.Role;
import com.alxmobilebackend.model.User;
import com.alxmobilebackend.repository.UserRepository;
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

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder; // Although not used directly in current UserService methods, good to mock if it were.

    @InjectMocks
    private UserService userService;

    private User testUser;
    private UserDto.UserResponse testUserResponse;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .password("encodedPassword")
                .roles(Set.of(Role.ROLE_USER))
                .build();

        testUserResponse = UserDto.UserResponse.builder()
                .id(testUser.getId())
                .username(testUser.getUsername())
                .email(testUser.getEmail())
                .roles(testUser.getRoles())
                .createdAt(testUser.getCreatedAt())
                .updatedAt(testUser.getUpdatedAt())
                .build();
    }

    @Test
    @DisplayName("Should return user by ID")
    void whenGetUserById_thenReturnUser() {
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));

        UserDto.UserResponse result = userService.getUserById(testUser.getId());

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(testUser.getId());
        assertThat(result.getUsername()).isEqualTo(testUser.getUsername());
        verify(userRepository, times(1)).findById(testUser.getId());
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when user by ID not found")
    void whenGetUserById_thenThrowResourceNotFound() {
        when(userRepository.findById(2L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.getUserById(2L));
        verify(userRepository, times(1)).findById(2L);
    }

    @Test
    @DisplayName("Should return all users paginated")
    void whenGetAllUsers_thenReturnPageOfUsers() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<User> userPage = new PageImpl<>(List.of(testUser), pageable, 1);
        when(userRepository.findAll(pageable)).thenReturn(userPage);

        Page<UserDto.UserResponse> result = userService.getAllUsers(pageable);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getId()).isEqualTo(testUser.getId());
        verify(userRepository, times(1)).findAll(pageable);
    }

    @Test
    @DisplayName("Should update user and return updated user DTO")
    void whenUpdateUser_thenUpdateAndReturnUser() {
        UserDto.UserUpdateRequest updateRequest = UserDto.UserUpdateRequest.builder()
                .username("updateduser")
                .email("updated@example.com")
                .build();

        User updatedUserEntity = User.builder()
                .id(testUser.getId())
                .username("updateduser")
                .email("updated@example.com")
                .password(testUser.getPassword())
                .roles(testUser.getRoles())
                .build();

        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(userRepository.existsByUsername("updateduser")).thenReturn(false);
        when(userRepository.existsByEmail("updated@example.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(updatedUserEntity);

        UserDto.UserResponse result = userService.updateUser(testUser.getId(), updateRequest);

        assertThat(result).isNotNull();
        assertThat(result.getUsername()).isEqualTo("updateduser");
        assertThat(result.getEmail()).isEqualTo("updated@example.com");
        verify(userRepository, times(1)).findById(testUser.getId());
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when updating non-existent user")
    void whenUpdateUser_thenThrowResourceNotFound() {
        UserDto.UserUpdateRequest updateRequest = UserDto.UserUpdateRequest.builder().username("newname").build();
        when(userRepository.findById(2L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.updateUser(2L, updateRequest));
        verify(userRepository, times(1)).findById(2L);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw ValidationException when updating with existing username")
    void whenUpdateUserWithExistingUsername_thenThrowValidationException() {
        UserDto.UserUpdateRequest updateRequest = UserDto.UserUpdateRequest.builder().username("existingUser").build();
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(userRepository.existsByUsername("existingUser")).thenReturn(true);

        assertThrows(ValidationException.class, () -> userService.updateUser(testUser.getId(), updateRequest));
        verify(userRepository, times(1)).findById(testUser.getId());
        verify(userRepository, times(1)).existsByUsername("existingUser");
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw ValidationException when updating with existing email")
    void whenUpdateUserWithExistingEmail_thenThrowValidationException() {
        UserDto.UserUpdateRequest updateRequest = UserDto.UserUpdateRequest.builder().email("existing@example.com").build();
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);

        assertThrows(ValidationException.class, () -> userService.updateUser(testUser.getId(), updateRequest));
        verify(userRepository, times(1)).findById(testUser.getId());
        verify(userRepository, times(1)).existsByEmail("existing@example.com");
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should delete user by ID")
    void whenDeleteUser_thenDeleteUser() {
        when(userRepository.existsById(testUser.getId())).thenReturn(true);
        doNothing().when(userRepository).deleteById(testUser.getId());

        userService.deleteUser(testUser.getId());

        verify(userRepository, times(1)).existsById(testUser.getId());
        verify(userRepository, times(1)).deleteById(testUser.getId());
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when deleting non-existent user")
    void whenDeleteUser_thenThrowResourceNotFound() {
        when(userRepository.existsById(2L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> userService.deleteUser(2L));
        verify(userRepository, times(1)).existsById(2L);
        verify(userRepository, never()).deleteById(anyLong());
    }
}
```