package com.alx.auth.system.data.repository;

import com.alx.auth.system.data.entity.Role;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Repository;

/**
 * Placeholder for a RoleRepository.
 * In a more complex system where roles are dynamic and managed, this would map to a Role entity.
 * For this system, roles are an Enum, so this repository is conceptual.
 *
 * @Cacheable: Annotates that the result of the method will be cached.
 * The 'roles' is the cache name, and 'roleName' is the key.
 */
@Repository
public class RoleRepository {

    /**
     * Simulates finding a Role by its name.
     * In a real application with dynamic roles, this would query a database table.
     * For this enum-based system, it simply converts the string name to a Role enum.
     *
     * @param roleName The name of the role (e.g., "USER", "ADMIN").
     * @return The corresponding Role enum.
     * @throws IllegalArgumentException if the role name does not match any defined Role enum.
     */
    @Cacheable(value = "roles", key = "#roleName")
    public Role findByName(String roleName) {
        // In a real system, you'd query a database table for roles.
        // For enum-based roles, we just parse the string.
        try {
            return Role.valueOf(roleName.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Role '" + roleName + "' does not exist.");
        }
    }
}