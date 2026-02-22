```java
package com.alx.chat.controller;

import com.alx.chat.dto.UserDTO;
import com.alx.chat.service.UserService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@Slf4j
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN') and (#id == authentication.principal.id or hasRole('ADMIN'))")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Long id) {
        log.debug("Request to get user by ID: {}", id);
        UserDTO user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/username/{username}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN') and (#username == authentication.principal.username or hasRole('ADMIN'))")
    public ResponseEntity<UserDTO> getUserByUsername(@PathVariable String username) {
        log.debug("Request to get user by username: {}", username);
        UserDTO user = userService.getUserByUsername(username);
        return ResponseEntity.ok(user);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')") // Only admins can view all users
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        log.debug("Request to get all users");
        List<UserDTO> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN') and (#id == authentication.principal.id or hasRole('ADMIN'))")
    public ResponseEntity<UserDTO> updateUser(@PathVariable Long id, @Valid @RequestBody UserDTO userDTO) {
        log.info("Request to update user with ID: {}", id);
        UserDTO updatedUser = userService.updateUser(id, userDTO);
        return ResponseEntity.ok(updatedUser);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')") // Only admins can delete users
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        log.info("Request to delete user with ID: {}", id);
        userService.deleteUser(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}
```