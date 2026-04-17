package com.alx.ecommerce.controller;

import com.alx.ecommerce.dto.MessageResponse;
import com.alx.ecommerce.dto.user.UserResponse;
import com.alx.ecommerce.dto.user.UserUpdateRequest;
import com.alx.ecommerce.service.UserService;
import com.alx.ecommerce.util.AppConstants;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import static com.alx.ecommerce.util.AppConstants.API_V1_BASE_URL;

/**
 * REST controller for managing user information.
 * Only ADMIN can access all users, users can access their own profile.
 */
@Tag(name = "User Management", description = "APIs for managing user profiles. Admin roles have full access, users can manage their own profile.")
@RestController
@RequestMapping(API_V1_BASE_URL + "/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * Retrieves all users with pagination and sorting.
     * Requires ADMIN role.
     *
     * @param pageNo   Page number (default 0).
     * @param pageSize Page size (default 10).
     * @param sortBy   Field to sort by (default "id").
     * @param sortDir  Sort direction (default "asc").
     * @return ResponseEntity with a page of user responses and HTTP status OK.
     */
    @Operation(summary = "Get all users (Admin only)",
            description = "Retrieves a paginated and sorted list of all user profiles. Requires ADMIN role.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Successfully retrieved users"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized"),
                    @ApiResponse(responseCode = "403", description = "Forbidden (missing ADMIN role)")
            },
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<Page<UserResponse>> getAllUsers(
            @RequestParam(value = "pageNo", defaultValue = AppConstants.DEFAULT_PAGE_NUMBER, required = false) int pageNo,
            @RequestParam(value = "pageSize", defaultValue = AppConstants.DEFAULT_PAGE_SIZE, required = false) int pageSize,
            @RequestParam(value = "sortBy", defaultValue = AppConstants.DEFAULT_SORT_BY, required = false) String sortBy,
            @RequestParam(value = "sortDir", defaultValue = AppConstants.DEFAULT_SORT_DIRECTION, required = false) String sortDir
    ) {
        Page<UserResponse> users = userService.getAllUsers(pageNo, pageSize, sortBy, sortDir);
        return new ResponseEntity<>(users, HttpStatus.OK);
    }

    /**
     * Retrieves a user by their ID.
     * Requires ADMIN role or the user accessing their own ID.
     *
     * @param id The ID of the user.
     * @return ResponseEntity with the user response and HTTP status OK.
     */
    @Operation(summary = "Get user by ID",
            description = "Retrieves a single user profile by their unique identifier. Requires ADMIN role or user accessing their own profile.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "User retrieved successfully"),
                    @ApiResponse(responseCode = "404", description = "User not found"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized"),
                    @ApiResponse(responseCode = "403", description = "Forbidden (attempting to access another user's profile without ADMIN role)")
            },
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @PreAuthorize("hasRole('ADMIN') or @securityService.isOwner(#id)") // Custom security service to check ownership
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        UserResponse user = userService.getUserById(id);
        return new ResponseEntity<>(user, HttpStatus.OK);
    }

    /**
     * Updates an existing user's information.
     * Requires ADMIN role or the user updating their own profile.
     *
     * @param id            The ID of the user to update.
     * @param updateRequest DTO containing updated user details.
     * @return ResponseEntity with the updated user response and HTTP status OK.
     */
    @Operation(summary = "Update user profile",
            description = "Updates an existing user's profile information. Requires ADMIN role or user updating their own profile.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "User updated successfully"),
                    @ApiResponse(responseCode = "400", description = "Bad Request (e.g., invalid data, username/email already exists)"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized"),
                    @ApiResponse(responseCode = "403", description = "Forbidden (attempting to update another user's profile without ADMIN role)"),
                    @ApiResponse(responseCode = "404", description = "User not found")
            },
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @PreAuthorize("hasRole('ADMIN') or @securityService.isOwner(#id)")
    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(@PathVariable Long id, @Valid @RequestBody UserUpdateRequest updateRequest) {
        UserResponse updatedUser = userService.updateUser(id, updateRequest);
        return new ResponseEntity<>(updatedUser, HttpStatus.OK);
    }

    /**
     * Deletes a user by their ID.
     * Requires ADMIN role.
     *
     * @param id The ID of the user to delete.
     * @return ResponseEntity with a success message and HTTP status NO_CONTENT.
     */
    @Operation(summary = "Delete user (Admin only)",
            description = "Deletes a user account by its ID. Requires ADMIN role.",
            responses = {
                    @ApiResponse(responseCode = "204", description = "User deleted successfully"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized"),
                    @ApiResponse(responseCode = "403", description = "Forbidden (missing ADMIN role)"),
                    @ApiResponse(responseCode = "404", description = "User not found")
            },
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return new ResponseEntity<>(new MessageResponse("User deleted successfully", HttpStatus.NO_CONTENT.value()), HttpStatus.NO_CONTENT);
    }
}