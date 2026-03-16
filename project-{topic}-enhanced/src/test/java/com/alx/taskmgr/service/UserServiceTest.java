```java
package com.alx.taskmgr.service;

import com.alx.taskmgr.dto.UserDTO;
import com.alx.taskmgr.exception.ResourceNotFoundException;
import com.alx.taskmgr.model.Role;
import com.alx.taskmgr.model.User;
import com.alx.taskmgr.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService Unit Tests")
public class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .password("encodedpassword")
                .role(Role.ROLE_USER)
                .build();
    }

    @Test
    @DisplayName("Should get user by ID successfully")
    void shouldGetUserByIdSuccessfully() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        UserDTO userDTO = userService.getUserById(1L);

        assertThat(userDTO).isNotNull();
        assertThat(userDTO.getId()).isEqualTo(1L);
        assertThat(userDTO.getUsername()).isEqualTo("testuser");
        assertThat(userDTO.getEmail()).isEqualTo("test@example.com");
        verify(userRepository, times(1)).findById(1L);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when user by ID not found")
    void shouldThrowExceptionWhenUserByIdNotFound() {
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.getUserById(99L));
        verify(userRepository, times(1)).findById(99L);
    }

    @Test
    @DisplayName("Should get user by username successfully")
    void shouldGetUserByUsernameSuccessfully() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));

        UserDTO userDTO = userService.getUserByUsername("testuser");

        assertThat(userDTO).isNotNull();
        assertThat(userDTO.getUsername()).isEqualTo("testuser");
        verify(userRepository, times(1)).findByUsername("testuser");
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when user by username not found")
    void shouldThrowExceptionWhenUserByUsernameNotFound() {
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.getUserByUsername("nonexistent"));
        verify(userRepository, times(1)).findByUsername("nonexistent");
    }
}
```