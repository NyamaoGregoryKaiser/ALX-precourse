```java
package com.alx.taskmgr.controller;

import com.alx.taskmgr.dto.UserDTO;
import com.alx.taskmgr.middleware.RateLimitInterceptor;
import com.alx.taskmgr.security.UserInfo;
import com.alx.taskmgr.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "User Management", description = "User specific information APIs")
public class UserController {

    private final UserService userService;

    @Operation(summary = "Get current authenticated user's profile")
    @GetMapping("/me")
    @PreAuthorize("hasRole('ROLE_USER')")
    public ResponseEntity<UserDTO> getCurrentUser(HttpServletRequest request) {
        // This endpoint will be rate limited by the RateLimitInterceptor
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserInfo userDetails = (UserInfo) authentication.getPrincipal();
        return ResponseEntity.ok(userService.getUserById(userDetails.getId()));
    }

    @Operation(summary = "Get user profile by ID (Admin only)")
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }
}
```