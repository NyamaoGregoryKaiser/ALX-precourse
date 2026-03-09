```java
package com.alx.pms.user.service;

import com.alx.pms.exception.ResourceNotFoundException;
import com.alx.pms.exception.ValidationException;
import com.alx.pms.model.Role;
import com.alx.pms.model.User;
import com.alx.pms.user.dto.UserResponse;
import com.alx.pms.user.dto.UserUpdateRequest;
import com.alx.pms.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setUsername("testuser");
        user.setEmail("test@example.com");
        user.setPassword("encodedPassword");
        user.setRoles(Set.of(Role.ROLE_USER));
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("Should load user by username successfully")
    void loadUserByUsername_Success() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));

        UserDetails userDetails = userService.loadUserByUsername("testuser");

        assertNotNull(userDetails);
        assertEquals("testuser", userDetails.getUsername());
        assertTrue(userDetails.getAuthorities().contains(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_USER")));
        verify(userRepository, times(1)).findByUsername("testuser");
    }

    @Test
    @DisplayName("Should throw UsernameNotFoundException when loading non-existent user")
    void loadUserByUsername_NotFound_ThrowsException() {
        when(userRepository.findByUsername("nonexistent")).thenReturn(Optional.empty());

        assertThrows(UsernameNotFoundException.class, () -> userService.loadUserByUsername("nonexistent"));
        verify(userRepository, times(1)).findByUsername("nonexistent");
    }

    @Test
    @DisplayName("Should get user by ID successfully")
    void getUserById_Success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        UserResponse response = userService.getUserById(1L);

        assertNotNull(response);
        assertEquals(1L, response.getId());
        assertEquals("testuser", response.getUsername());
        verify(userRepository, times(1)).findById(1L);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when getting non-existent user by ID")
    void getUserById_NotFound_ThrowsException() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.getUserById(99L));
        verify(userRepository, times(1)).findById(99L);
    }

    @Test
    @DisplayName("Should get all users successfully")
    void getAllUsers_Success() {
        User user2 = new User(2L, "user2", "user2@example.com", "pass2", Set.of(Role.ROLE_USER), LocalDateTime.now(), LocalDateTime.now(), Set.of());
        when(userRepository.findAll()).thenReturn(List.of(user, user2));

        List<UserResponse> responses = userService.getAllUsers();

        assertNotNull(responses);
        assertEquals(2, responses.size());
        assertEquals("testuser", responses.get(0).getUsername());
        assertEquals("user2", responses.get(1).getUsername());
        verify(userRepository, times(1)).findAll();
    }

    @Test
    @DisplayName("Should update user successfully")
    void updateUser_Success() {
        UserUpdateRequest request = new UserUpdateRequest();
        request.setUsername("updatedUser");
        request.setEmail("updated@example.com");
        request.setPassword("newPassword");

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.existsByUsername("updatedUser")).thenReturn(false);
        when(userRepository.existsByEmail("updated@example.com")).thenReturn(false);
        when(passwordEncoder.encode("newPassword")).thenReturn("newEncodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(user);

        UserResponse response = userService.updateUser(1L, request);

        assertNotNull(response);
        assertEquals("updatedUser", response.getUsername());
        assertEquals("updated@example.com", response.getEmail());
        verify(userRepository, times(1)).findById(1L);
        verify(userRepository, times(1)).existsByUsername("updatedUser");
        verify(userRepository, times(1)).existsByEmail("updated@example.example.com");
        verify(passwordEncoder, times(1)).encode("newPassword");
        verify(userRepository, times(1)).save(user);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when updating non-existent user")
    void updateUser_NotFound_ThrowsException() {
        UserUpdateRequest request = new UserUpdateRequest();
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.updateUser(99L, request));
        verify(userRepository, times(1)).findById(99L);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw ValidationException when updating with existing username")
    void updateUser_ExistingUsername_ThrowsException() {
        UserUpdateRequest request = new UserUpdateRequest();
        request.setUsername("existingUser");

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.existsByUsername("existingUser")).thenReturn(true);

        assertThrows(ValidationException.class, () -> userService.updateUser(1L, request));
        verify(userRepository, times(1)).findById(1L);
        verify(userRepository, times(1)).existsByUsername("existingUser");
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should delete user successfully")
    void deleteUser_Success() {
        when(userRepository.existsById(1L)).thenReturn(true);
        doNothing().when(userRepository).deleteById(1L);

        userService.deleteUser(1L);

        verify(userRepository, times(1)).existsById(1L);
        verify(userRepository, times(1)).deleteById(1L);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when deleting non-existent user")
    void deleteUser_NotFound_ThrowsException() {
        when(userRepository.existsById(99L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> userService.deleteUser(99L));
        verify(userRepository, times(1)).existsById(99L);
        verify(userRepository, never()).deleteById(anyLong());
    }
}
```