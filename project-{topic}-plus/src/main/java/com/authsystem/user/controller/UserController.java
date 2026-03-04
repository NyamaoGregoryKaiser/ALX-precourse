package com.authsystem.user.controller;

import com.authsystem.common.dto.ApiResponse;
import com.authsystem.user.dto.CreateUserRequest;
import com.authsystem.user.dto.UpdateUserRequest;
import com.authsystem.user.dto.UserDto;
import com.authsystem.user.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for managing user accounts.
 * Provides API endpoints for CRUD operations on users.
 *
 * Access to these endpoints is protected by Spring Security's
 * role-based authorization (e.g., ADMIN only for creation/deletion,
 * USER or ADMIN for viewing/updating own profile).
 *
 * {@code @RequiredArgsConstructor} generates a constructor for final fields,
 * allowing for constructor injection of dependencies.
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    private final UserService userService;

    /**
     * Retrieves a user by their ID.
     * Accessible by 'ADMIN' role, or by 'USER' if the requested ID matches their own.
     *
     * @param id The ID of the user to retrieve.
     * @param httpRequest The {@link HttpServletRequest} to get the request path.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse} with the {@link UserDto}.
     *         Returns HTTP 200 OK.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @userSecurity.isOwner(#id)")
    public ResponseEntity<ApiResponse<UserDto>> getUserById(
            @PathVariable Long id,
            HttpServletRequest httpRequest
    ) {
        logger.info("Fetching user with ID: {}", id);
        UserDto userDto = userService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.success(
                "User retrieved successfully",
                userDto,
                httpRequest.getRequestURI()
        ));
    }

    /**
     * Retrieves all users with pagination.
     * Accessible only by 'ADMIN' role.
     *
     * @param pageable The {@link Pageable} object for pagination (page, size, sort).
     * @param httpRequest The {@link HttpServletRequest} to get the request path.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse} with a {@link Page} of {@link UserDto}s.
     *         Returns HTTP 200 OK.
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<UserDto>>> getAllUsers(
            @PageableDefault(sort = "username", direction = Sort.Direction.ASC) Pageable pageable,
            HttpServletRequest httpRequest
    ) {
        logger.info("Fetching all users with pagination: {}", pageable);
        Page<UserDto> users = userService.getAllUsers(pageable);
        return ResponseEntity.ok(ApiResponse.success(
                "Users retrieved successfully",
                users,
                httpRequest.getRequestURI()
        ));
    }

    /**
     * Creates a new user.
     * Accessible only by 'ADMIN' role.
     *
     * @param request The {@link CreateUserRequest} containing details for the new user.
     * @param httpRequest The {@link HttpServletRequest} to get the request path.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse} with the {@link UserDto} of the created user.
     *         Returns HTTP 201 Created.
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserDto>> createUser(
            @Valid @RequestBody CreateUserRequest request,
            HttpServletRequest httpRequest
    ) {
        logger.info("Creating new user: {}", request.getUsername());
        UserDto createdUser = userService.createUser(request);
        return new ResponseEntity<>(ApiResponse.success(
                HttpStatus.CREATED.value(),
                "User created successfully",
                createdUser,
                httpRequest.getRequestURI()
        ), HttpStatus.CREATED);
    }

    /**
     * Updates an existing user by ID.
     * Accessible by 'ADMIN' role, or by 'USER' if the requested ID matches their own.
     *
     * @param id The ID of the user to update.
     * @param request The {@link UpdateUserRequest} containing updated user details.
     * @param httpRequest The {@link HttpServletRequest} to get the request path.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse} with the {@link UserDto} of the updated user.
     *         Returns HTTP 200 OK.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @userSecurity.isOwner(#id)")
    public ResponseEntity<ApiResponse<UserDto>> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request,
            HttpServletRequest httpRequest
    ) {
        logger.info("Updating user with ID: {}", id);
        UserDto updatedUser = userService.updateUser(id, request);
        return ResponseEntity.ok(ApiResponse.success(
                "User updated successfully",
                updatedUser,
                httpRequest.getRequestURI()
        ));
    }

    /**
     * Deletes a user by their ID.
     * Accessible only by 'ADMIN' role.
     *
     * @param id The ID of the user to delete.
     * @param httpRequest The {@link HttpServletRequest} to get the request path.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse} with a success message.
     *         Returns HTTP 204 No Content.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT) // Indicate successful deletion with no content
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable Long id,
            HttpServletRequest httpRequest
    ) {
        logger.info("Deleting user with ID: {}", id);
        userService.deleteUser(id);
        return new ResponseEntity<>(ApiResponse.success(
                HttpStatus.NO_CONTENT.value(),
                "User deleted successfully",
                null,
                httpRequest.getRequestURI()
        ), HttpStatus.NO_CONTENT);
    }

    /**
     * Helper bean for Spring Security's `@PreAuthorize` annotations.
     * This allows checking if the authenticated user is the owner of the resource.
     */
    @Component("userSecurity")
    public static class UserSecurity {
        private final UserService userService; // Inject UserService to fetch user details

        public UserSecurity(UserService userService) {
            this.userService = userService;
        }

        /**
         * Checks if the authenticated user's ID matches the given resource ID.
         * Used for self-access control (e.g., a user can update their own profile).
         *
         * @param userId The ID of the user resource to check.
         * @return {@code true} if the authenticated user owns the resource, {@code false} otherwise.
         */
        public boolean isOwner(Long userId) {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return false;
            }
            Object principal = authentication.getPrincipal();
            if (principal instanceof UserDetails userDetails) {
                // Fetch the user from the database based on the username to get their ID
                // Alternatively, you could put the user ID directly into the JWT claims.
                UserDto authenticatedUser = userService.getUserById(userDetails.getUsername()); // Assuming a method to get user by username
                return authenticatedUser != null && authenticatedUser.getId().equals(userId);
            }
            return false;
        }

        // To make `isOwner` work, we need a method in UserService to get UserDto by username.
        // Let's add it to UserService:
        public UserDto getUserById(String username) {
            // This is a simplified lookup. In a real app, you might cache this.
            return userService.userRepository.findByUsername(username)
                    .map(UserDto::fromEntity)
                    .orElse(null);
        }
    }
}