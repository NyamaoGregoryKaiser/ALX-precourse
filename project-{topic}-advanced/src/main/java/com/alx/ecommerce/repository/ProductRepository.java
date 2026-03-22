```java
package com.alx.ecommerce.repository;

import com.alx.ecommerce.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProductRepository extends JpaRepository<Product, UUID> {
    // Find products by category ID
    List<Product> findByCategoryId(Long categoryId);

    // Find products by name containing a keyword, case-insensitive
    List<Product> findByNameContainingIgnoreCase(String name);

    // Find products by category name
    @Query("SELECT p FROM Product p WHERE p.category.name = :categoryName")
    List<Product> findByCategoryName(@Param("categoryName") String categoryName);

    // Find all products with pagination and sorting
    Page<Product> findAll(Pageable pageable);

    // Custom query to find products below a certain price
    List<Product> findByPriceLessThan(java.math.BigDecimal price);
}
```