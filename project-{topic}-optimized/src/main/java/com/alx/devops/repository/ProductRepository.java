package com.alx.devops.repository;

import com.alx.devops.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for Product entities.
 * Provides standard CRUD operations and custom query methods.
 */
@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    /**
     * Finds all products belonging to a specific category.
     * @param categoryId The ID of the category.
     * @return A list of products in the specified category.
     */
    List<Product> findByCategoryId(Long categoryId);

    /**
     * Finds products containing a specific string in their name or description (case-insensitive).
     * This method demonstrates a simple search capability.
     * @param searchKeyword The keyword to search for.
     * @return A list of products matching the search criteria.
     */
    List<Product> findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(String searchKeyword, String searchKeyword2);
}