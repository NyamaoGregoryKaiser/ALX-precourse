package com.alx.taskmgr.controller;

import com.alx.taskmgr.dto.user.UserResponse;
import com.alx.taskmgr.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for managing user-related operations.
 * Requires ADMIN role for most operations.
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * Retrieves all users. Accessible only by ADMIN.
     * @return ResponseEntity with a list of UserResponse DTOs.
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        List<UserResponse> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    /**
     * Retrieves a user by ID. Accessible by ADMIN or the user themselves.
     * @param id The ID of the user.
     * @return ResponseEntity with UserResponse DTO.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or authentication.principal.id == #id") // assuming principal has 'id'
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        UserResponse user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }

    /**
     * Deletes a user by ID. Accessible only by ADMIN.
     * @param id The ID of the user to delete.
     * @return ResponseEntity indicating success.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}