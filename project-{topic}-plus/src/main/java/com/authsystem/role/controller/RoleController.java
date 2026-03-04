package com.authsystem.role.controller;

import com.authsystem.common.dto.ApiResponse;
import com.authsystem.role.dto.CreateRoleRequest;
import com.authsystem.role.dto.RoleDto;
import com.authsystem.role.dto.UpdateRoleRequest;
import com.authsystem.role.service.RoleService;
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
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for managing roles.
 * Provides API endpoints for CRUD operations on roles.
 *
 * Access to these endpoints is strictly protected by Spring Security,
 * requiring the 'ADMIN' role for all operations.
 *
 * {@code @RequiredArgsConstructor} generates a constructor for final fields,
 * allowing for constructor injection of dependencies.
 */
@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')") // All methods in this controller require ADMIN role
public class RoleController {

    private static final Logger logger = LoggerFactory.getLogger(RoleController.class);

    private final RoleService roleService;

    /**
     * Retrieves a role by its ID.
     *
     * @param id The ID of the role to retrieve.
     * @param httpRequest The {@link HttpServletRequest} to get the request path.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse} with the {@link RoleDto}.
     *         Returns HTTP 200 OK.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RoleDto>> getRoleById(
            @PathVariable Long id,
            HttpServletRequest httpRequest
    ) {
        logger.info("Fetching role with ID: {}", id);
        RoleDto roleDto = roleService.getRoleById(id);
        return ResponseEntity.ok(ApiResponse.success(
                "Role retrieved successfully",
                roleDto,
                httpRequest.getRequestURI()
        ));
    }

    /**
     * Retrieves all roles with pagination.
     *
     * @param pageable The {@link Pageable} object for pagination (page, size, sort).
     * @param httpRequest The {@link HttpServletRequest} to get the request path.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse} with a {@link Page} of {@link RoleDto}s.
     *         Returns HTTP 200 OK.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<RoleDto>>> getAllRoles(
            @PageableDefault(sort = "name", direction = Sort.Direction.ASC) Pageable pageable,
            HttpServletRequest httpRequest
    ) {
        logger.info("Fetching all roles with pagination: {}", pageable);
        Page<RoleDto> roles = roleService.getAllRoles(pageable);
        return ResponseEntity.ok(ApiResponse.success(
                "Roles retrieved successfully",
                roles,
                httpRequest.getRequestURI()
        ));
    }

    /**
     * Creates a new role.
     *
     * @param request The {@link CreateRoleRequest} containing details for the new role.
     * @param httpRequest The {@link HttpServletRequest} to get the request path.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse} with the {@link RoleDto} of the created role.
     *         Returns HTTP 201 Created.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<RoleDto>> createRole(
            @Valid @RequestBody CreateRoleRequest request,
            HttpServletRequest httpRequest
    ) {
        logger.info("Creating new role: {}", request.getName());
        RoleDto createdRole = roleService.createRole(request);
        return new ResponseEntity<>(ApiResponse.success(
                HttpStatus.CREATED.value(),
                "Role created successfully",
                createdRole,
                httpRequest.getRequestURI()
        ), HttpStatus.CREATED);
    }

    /**
     * Updates an existing role by ID.
     *
     * @param id The ID of the role to update.
     * @param request The {@link UpdateRoleRequest} containing the new role name.
     * @param httpRequest The {@link HttpServletRequest} to get the request path.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse} with the {@link RoleDto} of the updated role.
     *         Returns HTTP 200 OK.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RoleDto>> updateRole(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRoleRequest request,
            HttpServletRequest httpRequest
    ) {
        logger.info("Updating role with ID: {}", id);
        RoleDto updatedRole = roleService.updateRole(id, request);
        return ResponseEntity.ok(ApiResponse.success(
                "Role updated successfully",
                updatedRole,
                httpRequest.getRequestURI()
        ));
    }

    /**
     * Deletes a role by its ID.
     *
     * @param id The ID of the role to delete.
     * @param httpRequest The {@link HttpServletRequest} to get the request path.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse} with a success message.
     *         Returns HTTP 204 No Content.
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT) // Indicate successful deletion with no content
    public ResponseEntity<ApiResponse<Void>> deleteRole(
            @PathVariable Long id,
            HttpServletRequest httpRequest
    ) {
        logger.info("Deleting role with ID: {}", id);
        roleService.deleteRole(id);
        return new ResponseEntity<>(ApiResponse.success(
                HttpStatus.NO_CONTENT.value(),
                "Role deleted successfully",
                null,
                httpRequest.getRequestURI()
        ), HttpStatus.NO_CONTENT);
    }
}