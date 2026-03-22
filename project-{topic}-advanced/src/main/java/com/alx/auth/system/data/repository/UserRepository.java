package com.alx.auth.system.data.repository;

import com.alx.auth.system.data.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Spring Data JPA Repository for the User entity.
 * Provides standard CRUD operations and custom query methods for user management.
 *
 * @Repository: Indicates that this interface is a "Repository",
 * originally defined by Spring to be a mechanism for encapsulating storage, retrieval,
 * and search behavior which emulates a collection of objects.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Finds a user by their email address. Email is considered unique.
     *
     * @param email The email address of the user.
     * @return An Optional containing the User if found, or an empty Optional otherwise.
     */
    Optional<User> findByEmail(String email);

    /**
     * Checks if a user with the given email address exists.
     *
     * @param email The email address to check.
     * @return true if a user with the email exists, false otherwise.
     */
    boolean existsByEmail(String email);
}