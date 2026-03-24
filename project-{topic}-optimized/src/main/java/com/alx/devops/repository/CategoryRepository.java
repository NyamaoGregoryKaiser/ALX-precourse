package com.alx.devops.repository;

import com.alx.devops.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Spring Data JPA repository for Category entities.
 * Provides standard CRUD operations and custom query methods.
 */
@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    /**
     * Finds a category by its name.
     * Used for checking uniqueness or retrieving a specific category.
     * @param name The name of the category.
     * @return An Optional containing the category if found, or empty otherwise.
     */
    Optional<Category> findByName(String name);
}