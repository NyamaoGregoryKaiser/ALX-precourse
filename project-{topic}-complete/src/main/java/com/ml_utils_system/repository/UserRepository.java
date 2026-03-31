```java
package com.ml_utils_system.repository;

import com.ml_utils_system.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository interface for {@link User} entities.
 * Provides standard CRUD operations and custom query methods for users.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Finds a user by their username.
     *
     * @param username The username of the user.
     * @return An Optional containing the found User, or empty if not found.
     */
    Optional<User> findByUsername(String username);

    /**
     * Checks if a user with the given username exists.
     *
     * @param username The username to check.
     * @return True if a user with the username exists, false otherwise.
     */
    boolean existsByUsername(String username);

    /**
     * Checks if a user with the given email exists.
     *
     * @param email The email to check.
     * @return True if a user with the email exists, false otherwise.
     */
    boolean existsByEmail(String email);
}
```