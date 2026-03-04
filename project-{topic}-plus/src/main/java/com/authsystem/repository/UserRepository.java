package com.authsystem.repository;

import com.authsystem.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Spring Data JPA Repository for managing {@link User} entities.
 * Provides standard CRUD operations and custom query methods for user retrieval.
 *
 * This interface extends {@link JpaRepository}, which provides many methods
 * for interacting with a database out of the box (e.g., save, findById, findAll, delete).
 *
 * Custom methods are defined for common lookup patterns required by the authentication system,
 * such as finding a user by username or email, and checking for existence of username/email.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Finds a user by their username.
     * This method is crucial for Spring Security's {@code UserDetailsService}
     * to load user details during authentication.
     *
     * @param username The username of the user to find.
     * @return An {@link Optional} containing the found user, or an empty Optional if no user is found.
     */
    Optional<User> findByUsername(String username);

    /**
     * Finds a user by their email address.
     * Useful for login with email or for password recovery features.
     *
     * @param email The email address of the user to find.
     * @return An {@link Optional} containing the found user, or an empty Optional if no user is found.
     */
    Optional<User> findByEmail(String email);

    /**
     * Checks if a user with the given username exists in the database.
     * This is typically used during user registration to prevent duplicate usernames.
     *
     * @param username The username to check.
     * @return {@code true} if a user with the username exists, {@code false} otherwise.
     */
    boolean existsByUsername(String username);

    /**
     * Checks if a user with the given email address exists in the database.
     * This is typically used during user registration to prevent duplicate email addresses.
     *
     * @param email The email address to check.
     * @return {@code true} if a user with the email exists, {@code false} otherwise.
     */
    boolean existsByEmail(String email);
}