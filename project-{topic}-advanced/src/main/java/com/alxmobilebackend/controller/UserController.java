```java
package com.alxmobilebackend.controller;

import com.alxmobilebackend.dto.UserDto;
import com.alxmobilebackend.model.Role;
import com.alxmobilebackend.service.UserService;
import com.alxmobilebackend.util.Constants;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(Constants.USERS_PATH)
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "User Management", description = "API for managing users")
public class UserController {

    private final UserService userService;

    @Operation(summary = "Get user by ID", description = "Requires ADMIN or owner role")
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @securityService.isOwner(#id)") // Custom security service for owner check
    public ResponseEntity<UserDto.UserResponse> getUserById(@PathVariable Long id) {
        UserDto.UserResponse user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }

    @Operation(summary = "Get all users", description = "Requires ADMIN role")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<UserDto.UserResponse>> getAllUsers(Pageable pageable) {
        Page<UserDto.UserResponse> users = userService.getAllUsers(pageable);
        return ResponseEntity.ok(users);
    }

    @Operation(summary = "Update a user by ID", description = "Requires ADMIN or owner role")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @securityService.isOwner(#id)")
    public ResponseEntity<UserDto.UserResponse> updateUser(@PathVariable Long id,
                                                           @Valid @RequestBody UserDto.UserUpdateRequest request) {
        UserDto.UserResponse updatedUser = userService.updateUser(id, request);
        return ResponseEntity.ok(updatedUser);
    }

    @Operation(summary = "Delete a user by ID", description = "Requires ADMIN role")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
    }
}

// Dummy SecurityService for @PreAuthorize
// In a real app, this might be more complex, checking if the authenticated user's ID matches the resource ID.
@Service("securityService")
class SecurityService {
    public boolean isOwner(Long userId) {
        Long authenticatedUserId = ((com.alxmobilebackend.model.User) SecurityContextHolder.getContext().getAuthentication().getPrincipal()).getId(); // Assuming CustomUserDetailsService returns User entity
        return authenticatedUserId.equals(userId);
    }
    // Note: The CustomUserDetailsService currently returns `org.springframework.security.core.userdetails.User`.
    // For `((User) SecurityContextHolder.getContext().getAuthentication().getPrincipal()).getId()`,
    // you would need to return your custom User object that extends UserDetails in CustomUserDetailsService.
    // For simplicity, for now, we'll assume `authentication.getName()` gives us the email and we fetch the user from there.
    // A better approach would be to have a custom `UserPrincipal` object.
    // For the given context, `authentication.getName()` (which is email) can be used to fetch the User and check its ID.
    // Let's adjust this for the current setup:
     private final UserRepository userRepository;

    public SecurityService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public boolean isOwner(Long userId) {
        String authenticatedUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(authenticatedUserEmail)
                .map(user -> user.getId().equals(userId))
                .orElse(false);
    }
}
```