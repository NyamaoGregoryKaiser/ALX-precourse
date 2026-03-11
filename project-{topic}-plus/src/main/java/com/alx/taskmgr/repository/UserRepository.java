```java
package com.alx.taskmgr.repository;

import com.alx.taskmgr.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository interface for {@link User} entities.
 * Extends Spring Data JPA's JpaRepository to provide standard CRUD operations
 * and custom query methods for users.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Finds a user by their email address.
     * Email is a unique identifier for users.
     *
     * @param email The email address of the user to find.
     * @return An Optional containing the found User, or empty if no user with that email exists.
     */
    Optional<User> findByEmail(String email);

    /**
     * Checks if a user with the given email address already exists.
     * Useful during registration to prevent duplicate email accounts.
     *
     * @param email The email address to check for existence.
     * @return {@code true} if a user with the email exists, {@code false} otherwise.
     */
    boolean existsByEmail(String email);
}
```