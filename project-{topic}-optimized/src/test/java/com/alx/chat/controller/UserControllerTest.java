```java
package com.alx.chat.controller;

import com.alx.chat.dto.UserDTO;
import com.alx.chat.exception.ResourceNotFoundException;
import com.alx.chat.service.UserService;
import com.alx.chat.service.UserDetailsImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@Import({GlobalExceptionHandler.class}) // Import global exception handler for proper error mapping
public class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserService userService;

    private UserDTO testUserDTO;
    private UserDetailsImpl userDetails;

    @BeforeEach
    void setUp() {
        testUserDTO = new UserDTO(1L, "testuser", "test@example.com", LocalDateTime.now(), null, Set.of("ROLE_USER"));
        userDetails = new UserDetailsImpl(1L, "testuser", "test@example.com", "encodedpass", Collections.singleton(new SimpleGrantedAuthority("ROLE_USER")));

        // Set up security context for tests
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    @Test
    void getUserById_success() throws Exception {
        when(userService.getUserById(1L)).thenReturn(testUserDTO);

        mockMvc.perform(get("/api/v1/users/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    void getUserById_notFound() throws Exception {
        when(userService.getUserById(99L)).thenThrow(new ResourceNotFoundException("User not found with ID: 99"));

        mockMvc.perform(get("/api/v1/users/99")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User not found with ID: 99"));
    }

    @Test
    void getUserByUsername_success() throws Exception {
        when(userService.getUserByUsername("testuser")).thenReturn(testUserDTO);

        mockMvc.perform(get("/api/v1/users/username/testuser")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("test@example.com"));
    }

    @Test
    void getAllUsers_accessDeniedForUser() throws Exception {
        // As a non-admin, this should be forbidden
        mockMvc.perform(get("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    void getAllUsers_accessAllowedForAdmin() throws Exception {
        // Change user to admin
        UserDetailsImpl adminDetails = new UserDetailsImpl(2L, "adminuser", "admin@example.com", "encodedpass", Collections.singleton(new SimpleGrantedAuthority("ROLE_ADMIN")));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(adminDetails, null, adminDetails.getAuthorities()));

        List<UserDTO> allUsers = List.of(testUserDTO, new UserDTO(2L, "adminuser", "admin@example.com", LocalDateTime.now(), null, Set.of("ROLE_ADMIN")));
        when(userService.getAllUsers()).thenReturn(allUsers);

        mockMvc.perform(get("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("testuser"))
                .andExpect(jsonPath("$[1].username").value("adminuser"));
    }

    @Test
    void updateUser_success() throws Exception {
        UserDTO updatedUserDTO = new UserDTO(1L, "updateduser", "updated@example.com", LocalDateTime.now(), null, Set.of("ROLE_USER"));
        when(userService.updateUser(eq(1L), any(UserDTO.class))).thenReturn(updatedUserDTO);

        mockMvc.perform(put("/api/v1/users/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedUserDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("updateduser"));
    }

    @Test
    void updateUser_accessDeniedForDifferentUser() throws Exception {
        UserDTO updatedUserDTO = new UserDTO(2L, "anotheruser", "another@example.com", LocalDateTime.now(), null, Set.of("ROLE_USER"));

        mockMvc.perform(put("/api/v1/users/2") // Attempt to update user 2 as user 1
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedUserDTO)))
                .andExpect(status().isForbidden());
    }

    @Test
    void deleteUser_accessDeniedForUser() throws Exception {
        mockMvc.perform(delete("/api/v1/users/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    void deleteUser_accessAllowedForAdmin() throws Exception {
        // Change user to admin
        UserDetailsImpl adminDetails = new UserDetailsImpl(2L, "adminuser", "admin@example.com", "encodedpass", Collections.singleton(new SimpleGrantedAuthority("ROLE_ADMIN")));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(adminDetails, null, adminDetails.getAuthorities()));

        doNothing().when(userService).deleteUser(1L);

        mockMvc.perform(delete("/api/v1/users/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());
    }

    @Test
    void deleteUser_notFound() throws Exception {
        // Change user to admin
        UserDetailsImpl adminDetails = new UserDetailsImpl(2L, "adminuser", "admin@example.com", "encodedpass", Collections.singleton(new SimpleGrantedAuthority("ROLE_ADMIN")));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(adminDetails, null, adminDetails.getAuthorities()));

        doThrow(new ResourceNotFoundException("User not found with ID: 99"))
                .when(userService).deleteUser(99L);

        mockMvc.perform(delete("/api/v1/users/99")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User not found with ID: 99"));
    }
}
```