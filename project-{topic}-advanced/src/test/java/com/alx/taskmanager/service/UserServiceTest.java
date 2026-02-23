package com.alx.taskmanager.service;

import com.alx.taskmanager.dto.UserDTO;
import com.alx.taskmanager.exception.ResourceNotFoundException;
import com.alx.taskmanager.model.Role;
import com.alx.taskmanager.model.User;
import com.alx.taskmanager.model.UserRole;
import com.alx.taskmanager.repository.UserRepository;
import com.alx.taskmanager.util.MapperUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.HashSet;
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
    @Mock
    private PasswordEncoder passwordEncoder; // Not directly used in current service methods, but good to have
    @Mock
    private MapperUtil mapperUtil;

    @InjectMocks
    private UserService userService;

    private User user;
    private UserDTO userDTO;

    @BeforeEach
    void setUp() {
        Role userRole = new Role(1, UserRole.ROLE_USER);
        Set<Role> roles = new HashSet<>(Collections.singletonList(userRole));

        user = new User(1L, "testuser", "password", "test@example.com", roles, new HashSet<>(), new HashSet<>());
        userDTO = new UserDTO();
        userDTO.setId(1L);
        userDTO.setUsername("testuser");
        userDTO.setEmail("test@example.com");
        userDTO.setRoles(Collections.singleton(UserRole.ROLE_USER));
    }

    @Test
    void getUserById_ExistingUser_ReturnsUserDTO() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(mapperUtil.toUserDTO(user)).thenReturn(userDTO);

        UserDTO foundUser = userService.getUserById(1L);

        assertNotNull(foundUser);
        assertEquals(user.getUsername(), foundUser.getUsername());
        verify(userRepository, times(1)).findById(1L);
        verify(mapperUtil, times(1)).toUserDTO(user);
    }

    @Test
    void getUserById_NonExistingUser_ThrowsResourceNotFoundException() {
        when(userRepository.findById(2L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.getUserById(2L));
        verify(userRepository, times(1)).findById(2L);
        verify(mapperUtil, never()).toUserDTO(any());
    }

    @Test
    void getAllUsers_ReturnsListOfUserDTOs() {
        User user2 = new User(2L, "user2", "pass2", "user2@example.com", new HashSet<>(), new HashSet<>(), new HashSet<>());
        UserDTO userDTO2 = new UserDTO();
        userDTO2.setId(2L);
        userDTO2.setUsername("user2");

        when(userRepository.findAll()).thenReturn(List.of(user, user2));
        when(mapperUtil.toUserDTO(user)).thenReturn(userDTO);
        when(mapperUtil.toUserDTO(user2)).thenReturn(userDTO2);

        List<UserDTO> users = userService.getAllUsers();

        assertNotNull(users);
        assertEquals(2, users.size());
        assertEquals(userDTO.getUsername(), users.get(0).getUsername());
        assertEquals(userDTO2.getUsername(), users.get(1).getUsername());
        verify(userRepository, times(1)).findAll();
        verify(mapperUtil, times(2)).toUserDTO(any(User.class));
    }

    @Test
    void updateUser_ExistingUser_ReturnsUpdatedUserDTO() {
        UserDTO updatedUserDTO = new UserDTO();
        updatedUserDTO.setUsername("updatedUser");
        updatedUserDTO.setEmail("updated@example.com");

        User updatedUser = new User(1L, "updatedUser", "password", "updated@example.com", user.getRoles(), new HashSet<>(), new HashSet<>());

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(updatedUser);
        when(mapperUtil.toUserDTO(updatedUser)).thenReturn(updatedUserDTO);

        UserDTO result = userService.updateUser(1L, updatedUserDTO);

        assertNotNull(result);
        assertEquals(updatedUserDTO.getUsername(), result.getUsername());
        assertEquals(updatedUserDTO.getEmail(), result.getEmail());
        verify(userRepository, times(1)).findById(1L);
        verify(userRepository, times(1)).save(user);
        verify(mapperUtil, times(1)).toUserDTO(updatedUser);
        assertEquals("updatedUser", user.getUsername()); // Verify entity modification
        assertEquals("updated@example.com", user.getEmail());
    }

    @Test
    void updateUser_NonExistingUser_ThrowsResourceNotFoundException() {
        UserDTO updatedUserDTO = new UserDTO();
        when(userRepository.findById(2L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.updateUser(2L, updatedUserDTO));
        verify(userRepository, times(1)).findById(2L);
        verify(userRepository, never()).save(any(User.class));
        verify(mapperUtil, never()).toUserDTO(any());
    }

    @Test
    void deleteUser_ExistingUser_DeletesUser() {
        when(userRepository.existsById(1L)).thenReturn(true);
        doNothing().when(userRepository).deleteById(1L);

        userService.deleteUser(1L);

        verify(userRepository, times(1)).existsById(1L);
        verify(userRepository, times(1)).deleteById(1L);
    }

    @Test
    void deleteUser_NonExistingUser_ThrowsResourceNotFoundException() {
        when(userRepository.existsById(2L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> userService.deleteUser(2L));
        verify(userRepository, times(1)).existsById(2L);
        verify(userRepository, never()).deleteById(anyLong());
    }

    @Test
    void findUserEntityById_ExistingUser_ReturnsUserEntity() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        User foundUser = userService.findUserEntityById(1L);

        assertNotNull(foundUser);
        assertEquals(user.getUsername(), foundUser.getUsername());
        verify(userRepository, times(1)).findById(1L);
    }

    @Test
    void findUserEntityById_NonExistingUser_ThrowsResourceNotFoundException() {
        when(userRepository.findById(2L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.findUserEntityById(2L));
        verify(userRepository, times(1)).findById(2L);
    }

    @Test
    void findUserEntityByUsername_ExistingUser_ReturnsUserEntity() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));

        User foundUser = userService.findUserEntityByUsername("testuser");

        assertNotNull(foundUser);
        assertEquals(user.getUsername(), foundUser.getUsername());
        verify(userRepository, times(1)).findByUsername("testuser");
    }

    @Test
    void findUserEntityByUsername_NonExistingUser_ThrowsResourceNotFoundException() {
        when(userRepository.findByUsername("nonexistent")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.findUserEntityByUsername("nonexistent"));
        verify(userRepository, times(1)).findByUsername("nonexistent");
    }
}