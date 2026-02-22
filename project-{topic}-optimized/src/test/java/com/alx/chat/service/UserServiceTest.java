```java
package com.alx.chat.service;

import com.alx.chat.dto.UserDTO;
import com.alx.chat.entity.User;
import com.alx.chat.exception.ResourceNotFoundException;
import com.alx.chat.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    private User testUser;
    private UserDTO testUserDTO;

    @BeforeEach
    void setUp() {
        testUser = new User(1L, "testuser", "test@example.com", "password", LocalDateTime.now(), null, Set.of("ROLE_USER"), null, null);
        testUserDTO = new UserDTO(1L, "testuser", "test@example.com", LocalDateTime.now(), null, Set.of("ROLE_USER"));
    }

    @Test
    void getUserById_success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        UserDTO foundUser = userService.getUserById(1L);

        assertNotNull(foundUser);
        assertEquals(testUserDTO.getUsername(), foundUser.getUsername());
    }

    @Test
    void getUserById_notFound() {
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.getUserById(99L));
    }

    @Test
    void getUserByUsername_success() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

        UserDTO foundUser = userService.getUserByUsername("testuser");

        assertNotNull(foundUser);
        assertEquals(testUserDTO.getUsername(), foundUser.getUsername());
    }

    @Test
    void getUserByUsername_notFound() {
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.getUserByUsername("nonexistent"));
    }

    @Test
    void getAllUsers_success() {
        when(userRepository.findAll()).thenReturn(List.of(testUser, new User(2L, "user2", "user2@example.com", "pass2", LocalDateTime.now(), null, Set.of("ROLE_USER"), null, null)));

        List<UserDTO> users = userService.getAllUsers();

        assertNotNull(users);
        assertEquals(2, users.size());
        assertEquals("testuser", users.get(0).getUsername());
        assertEquals("user2", users.get(1).getUsername());
    }

    @Test
    void updateUser_success() {
        UserDTO updatedInfo = new UserDTO(1L, "updateduser", "updated@example.com", null, null, null);
        User updatedUser = new User(1L, "updateduser", "updated@example.com", "password", LocalDateTime.now(), null, Set.of("ROLE_USER"), null, null);

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(updatedUser);

        UserDTO result = userService.updateUser(1L, updatedInfo);

        assertNotNull(result);
        assertEquals("updateduser", result.getUsername());
        assertEquals("updated@example.com", result.getEmail());
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void updateUser_notFound() {
        UserDTO updatedInfo = new UserDTO(99L, "updateduser", "updated@example.com", null, null, null);
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.updateUser(99L, updatedInfo));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void deleteUser_success() {
        when(userRepository.existsById(1L)).thenReturn(true);
        doNothing().when(userRepository).deleteById(1L);

        userService.deleteUser(1L);

        verify(userRepository, times(1)).deleteById(1L);
    }

    @Test
    void deleteUser_notFound() {
        when(userRepository.existsById(anyLong())).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> userService.deleteUser(99L));
        verify(userRepository, never()).deleteById(anyLong());
    }
}
```