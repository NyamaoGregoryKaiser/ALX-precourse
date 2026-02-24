```java
package com.alx.chat.controller;

import com.alx.chat.dto.UserDto;
import com.alx.chat.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller for user-related operations.
 * Handles API endpoints for /api/users.
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Users", description = "User profile and details APIs")
@SecurityRequirement(name = "bearerAuth") // Requires JWT authentication for all endpoints in this controller
public class UserController {

    private final UserService userService;

    /**
     * Retrieves the profile of the currently authenticated user.
     * @param userDetails Authenticated user details.
     * @return ResponseEntity with the UserDto of the current user.
     */
    @Operation(summary = "Get current user profile")
    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        log.debug("Fetching profile for current user: {}", userDetails.getUsername());
        UserDto user = userService.getUserByUsername(userDetails.getUsername());
        return ResponseEntity.ok(user);
    }

    /**
     * Retrieves a user's profile by their username.
     * @param username The username of the user to retrieve.
     * @return ResponseEntity with the UserDto of the specified user.
     */
    @Operation(summary = "Get user profile by username")
    @GetMapping("/{username}")
    public ResponseEntity<UserDto> getUserByUsername(@PathVariable String username) {
        log.debug("Fetching profile for user: {}", username);
        UserDto user = userService.getUserByUsername(username);
        return ResponseEntity.ok(user);
    }
}
```