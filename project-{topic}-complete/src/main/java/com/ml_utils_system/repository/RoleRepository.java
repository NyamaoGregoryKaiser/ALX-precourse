```java
package com.ml_utils_system.repository;

import com.ml_utils_system.model.ERole;
import com.ml_utils_system.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository interface for {@link Role} entities.
 * Provides standard CRUD operations and custom query methods for roles.
 */
@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {

    /**
     * Finds a role by its enumerated name.
     *
     * @param name The {@link ERole} enum value (e.g., ROLE_USER, ROLE_ADMIN).
     * @return An Optional containing the found Role, or empty if not found.
     */
    Optional<Role> findByName(ERole name);
}
```