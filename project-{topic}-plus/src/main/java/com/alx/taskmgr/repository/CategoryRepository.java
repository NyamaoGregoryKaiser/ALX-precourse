```java
package com.alx.taskmgr.repository;

import com.alx.taskmgr.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository interface for {@link Category} entities.
 * Extends Spring Data JPA's JpaRepository to provide standard CRUD operations
 * and custom query methods for categories.
 */
@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    /**
     * Finds a category by its name, case-insensitively.
     * Useful for checking uniqueness during category creation.
     *
     * @param name The name of the category to find.
     * @return An Optional containing the found Category, or empty if not found.
     */
    Optional<Category> findByNameIgnoreCase(String name);

    /**
     * Checks if a category with the given name (case-insensitive) exists,
     * excluding a category with a specific ID. This is useful for update operations
     * to ensure a category name remains unique while allowing the existing category
     * to keep its name.
     *
     * @param name The name to check.
     * @param id   The ID of the category to exclude from the uniqueness check.
     * @return {@code true} if another category with the same name exists, {@code false} otherwise.
     */
    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
```