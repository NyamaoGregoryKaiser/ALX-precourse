```java
package com.alx.pms.user.controller;

import com.alx.pms.user.dto.UserResponse;
import com.alx.pms.user.dto.UserUpdateRequest;
import com.alx.pms.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "Users", description = "User management APIs")
@Slf4j
public class UserController {

    private final UserService userService;

    @Operation(summary = "Get current user's profile")
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        log.debug("Fetching profile for current user: {}", userDetails.getUsername());
        com.alx.pms.model.User user = (com.alx.pms.model.User) userDetails;
        return ResponseEntity.ok(userService.getUserById(user.getId()));
    }

    @Operation(summary = "Update current user's profile")
    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateCurrentUser(@AuthenticationPrincipal UserDetails userDetails,
                                                          @Valid @RequestBody UserUpdateRequest request) {
        log.info("Updating profile for current user: {}", userDetails.getUsername());
        com.alx.pms.model.User user = (com.alx.pms.model.User) userDetails;
        return ResponseEntity.ok(userService.updateUser(user.getId(), request));
    }

    @Operation(summary = "Get user by ID (Admin only)")
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.id")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        log.debug("Fetching user by ID: {}", id);
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @Operation(summary = "Get all users (Admin only)")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        log.debug("Fetching all users.");
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @Operation(summary = "Delete user by ID (Admin only)")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        log.info("Deleting user with ID: {}", id);
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
```