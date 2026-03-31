```java
package com.ml_utils_system.controller;

import com.ml_utils_system.dto.UserDto;
import com.ml_utils_system.service.UserService;
import com.ml_utils_system.util.CustomLogger;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for managing user information (primarily for administrative purposes).
 * Provides API endpoints for CRUD operations on user resources.
 */
@RestController
@RequestMapping("/api/users")
@Tag(name = "Users", description = "API for managing user accounts (Admin only)")
public class UserController {

    private static final Logger logger = CustomLogger.getLogger(UserController.class);

    @Autowired
    private UserService userService;

    /**
     * Retrieves a user by their ID.
     * Requires ADMIN role.
     *
     * @param id The ID of the user.
     * @return A ResponseEntity with the UserDto and HTTP status 200 OK.
     */
    @Operation(summary = "Get a user by ID",
            description = "Requires ADMIN role. Retrieves details of a specific user.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "User found",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = UserDto.class))),
            @ApiResponse(responseCode = "404", description = "User not found",
                    content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content)
    })
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUserById(@PathVariable Long id) {
        logger.info("Received request to get user with ID: {}", id);
        UserDto user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }

    /**
     * Retrieves all users with pagination.
     * Requires ADMIN role.
     *
     * @param page The page number (default 0).
     * @param size The number of items per page (default 10).
     * @param sortBy The field to sort by (default 'id').
     * @param sortDir The sort direction (default 'asc').
     * @return A ResponseEntity with a Page of UserDto and HTTP status 200 OK.
     */
    @Operation(summary = "Get all users with pagination",
            description = "Requires ADMIN role. Retrieves a paginated list of all users.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved list of users",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = Page.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content)
    })
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<Page<UserDto>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {
        logger.info("Received request to get all users (page: {}, size: {}, sortBy: {}, sortDir: {})", page, size, sortBy, sortDir);
        Sort sort = sortDir.equalsIgnoreCase(Sort.Direction.ASC.name()) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<UserDto> users = userService.getAllUsers(pageable);
        return ResponseEntity.ok(users);
    }

    /**
     * Updates an existing user's details.
     * Requires ADMIN role.
     *
     * @param id The ID of the user to update.
     * @param userDto The DTO containing updated user information.
     * @return A ResponseEntity with the updated UserDto and HTTP status 200 OK.
     */
    @Operation(summary = "Update an existing user",
            description = "Requires ADMIN role. Updates the details of an existing user.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "User updated successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = UserDto.class))),
            @ApiResponse(responseCode = "400", description = "Invalid input",
                    content = @Content),
            @ApiResponse(responseCode = "404", description = "User not found",
                    content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content)
    })
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<UserDto> updateUser(@PathVariable Long id, @Valid @RequestBody UserDto userDto) {
        logger.info("Received request to update user with ID: {}", id);
        UserDto updatedUser = userService.updateUser(id, userDto);
        return ResponseEntity.ok(updatedUser);
    }

    /**
     * Deletes a user by their ID.
     * Requires ADMIN role.
     *
     * @param id The ID of the user to delete.
     * @return A ResponseEntity with HTTP status 204 No Content.
     */
    @Operation(summary = "Delete a user by ID",
            description = "Requires ADMIN role. Deletes a specific user account.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "User deleted successfully",
                    content = @Content),
            @ApiResponse(responseCode = "404", description = "User not found",
                    content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content)
    })
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        logger.info("Received request to delete user with ID: {}", id);
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
```