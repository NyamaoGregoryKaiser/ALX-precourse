package com.authsystem.role.service;

import com.authsystem.common.exception.ResourceNotFoundException;
import com.authsystem.common.exception.ValidationException;
import com.authsystem.model.Role;
import com.authsystem.repository.RoleRepository;
import com.authsystem.role.dto.CreateRoleRequest;
import com.authsystem.role.dto.RoleDto;
import com.authsystem.role.dto.UpdateRoleRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static com.authsystem.config.CachingConfig.ROLES_CACHE;

/**
 * Service class for managing role-related business logic.
 * This includes CRUD operations for roles and data validation.
 * It interacts with {@link RoleRepository}.
 *
 * {@code @RequiredArgsConstructor} generates a constructor for final fields,
 * allowing for constructor injection of dependencies.
 *
 * Caching annotations ({@code @Cacheable}, {@code @CachePut}, {@code @CacheEvict})
 * are used to improve performance for frequently accessed role data.
 */
@Service
@RequiredArgsConstructor
public class RoleService {

    private static final Logger logger = LoggerFactory.getLogger(RoleService.class);

    private final RoleRepository roleRepository;

    /**
     * Retrieves a role by its ID.
     * The result of this method is cached to reduce database hits for repeated lookups.
     *
     * @param id The ID of the role to retrieve.
     * @return The {@link RoleDto} representing the found role.
     * @throws ResourceNotFoundException If no role is found with the given ID.
     */
    @Cacheable(value = ROLES_CACHE, key = "#id")
    @Transactional(readOnly = true)
    public RoleDto getRoleById(Long id) {
        logger.debug("Fetching role with ID: {}", id);
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with ID: " + id));
        logger.info("Found role with ID: {}", id);
        return RoleDto.fromEntity(role);
    }

    /**
     * Retrieves all roles with pagination.
     *
     * @param pageable The {@link Pageable} object for pagination information.
     * @return A {@link Page} of {@link RoleDto} objects.
     */
    @Transactional(readOnly = true)
    public Page<RoleDto> getAllRoles(Pageable pageable) {
        logger.debug("Fetching all roles with page: {}, size: {}", pageable.getPageNumber(), pageable.getPageSize());
        Page<Role> rolesPage = roleRepository.findAll(pageable);
        logger.info("Fetched {} roles from page {}", rolesPage.getNumberOfElements(), pageable.getPageNumber());
        return rolesPage.map(RoleDto::fromEntity);
    }

    /**
     * Creates a new role in the system.
     *
     * 1. Validates if a role with the same name already exists.
     * 2. Saves the new role to the database.
     *
     * @param request The {@link CreateRoleRequest} containing details for the new role.
     * @return The {@link RoleDto} of the newly created role.
     * @throws ValidationException If a role with the same name already exists.
     */
    @Transactional
    @CacheEvict(value = ROLES_CACHE, allEntries = true) // Clear all role caches when a new role is created
    public RoleDto createRole(CreateRoleRequest request) {
        logger.info("Creating new role: {}", request.getName());

        if (roleRepository.existsByName(request.getName())) {
            throw new ValidationException("Role name '" + request.getName() + "' already exists.", "role_name_taken");
        }

        Role role = Role.builder()
                .name(request.getName())
                .build();

        Role savedRole = roleRepository.save(role);
        logger.info("Role '{}' created successfully with ID: {}", savedRole.getName(), savedRole.getId());
        return RoleDto.fromEntity(savedRole);
    }

    /**
     * Updates an existing role's name.
     *
     * @param id The ID of the role to update.
     * @param request The {@link UpdateRoleRequest} containing the new role name.
     * @return The {@link RoleDto} of the updated role.
     * @throws ResourceNotFoundException If no role is found with the given ID.
     * @throws ValidationException If the new role name already exists.
     */
    @Transactional
    @CachePut(value = ROLES_CACHE, key = "#id") // Update cache entry for the modified role
    public RoleDto updateRole(Long id, UpdateRoleRequest request) {
        logger.info("Updating role with ID: {}", id);
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with ID: " + id));

        if (!request.getName().equals(role.getName()) && roleRepository.existsByName(request.getName())) {
            throw new ValidationException("Role name '" + request.getName() + "' is already taken.", "role_name_taken");
        }

        role.setName(request.getName());
        Role updatedRole = roleRepository.save(role);
        logger.info("Role with ID: {} updated successfully to name: {}", id, updatedRole.getName());
        return RoleDto.fromEntity(updatedRole);
    }

    /**
     * Deletes a role by its ID.
     * Checks if the role exists before attempting to delete.
     * The cache entry for the deleted role is evicted.
     *
     * @param id The ID of the role to delete.
     * @throws ResourceNotFoundException If no role is found with the given ID.
     * @throws ValidationException If the role is currently assigned to users, preventing deletion.
     */
    @Transactional
    @CacheEvict(value = ROLES_CACHE, key = "#id") // Evict cache entry for the deleted role
    public void deleteRole(Long id) {
        logger.info("Deleting role with ID: {}", id);
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with ID: " + id));

        // Prevent deletion if role is assigned to any users
        if (!role.getUsers().isEmpty()) {
            throw new ValidationException("Cannot delete role '" + role.getName() + "'. It is currently assigned to " + role.getUsers().size() + " user(s).", "role_in_use");
        }

        roleRepository.delete(role);
        logger.info("Role with ID: {} deleted successfully.", id);
    }
}