package com.authsystem.repository;

import com.authsystem.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Spring Data JPA Repository for managing {@link Role} entities.
 * Provides standard CRUD operations and custom query methods for role retrieval.
 *
 * This interface extends {@link JpaRepository}, which provides many methods
 * for interacting with a database out of the box (e.g., save, findById, findAll, delete).
 *
 * A custom method is defined for finding a role by its name, which is crucial for
 * assigning roles to users during registration or administrative tasks.
 */
@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {

    /**
     * Finds a role by its name.
     * Role names are typically unique and used as identifiers for programmatic access
     * (e.g., "ROLE_USER", "ROLE_ADMIN").
     *
     * @param name The name of the role to find.
     * @return An {@link Optional} containing the found role, or an empty Optional if no role is found.
     */
    Optional<Role> findByName(String name);

    /**
     * Checks if a role with the given name exists in the database.
     * This is typically used to prevent creating duplicate roles.
     *
     * @param name The name of the role to check.
     * @return {@code true} if a role with the name exists, {@code false} otherwise.
     */
    boolean existsByName(String name);
}