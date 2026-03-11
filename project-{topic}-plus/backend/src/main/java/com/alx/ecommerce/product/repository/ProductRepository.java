package com.alx.ecommerce.product.repository;

import com.alx.ecommerce.product.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findBySku(String sku);
    List<Product> findByCategoryId(Long categoryId);

    // Example of a custom query for searching products
    @Query("SELECT p FROM Product p WHERE lower(p.name) LIKE lower(concat('%', :keyword, '%')) OR lower(p.description) LIKE lower(concat('%', :keyword, '%'))")
    List<Product> searchProducts(String keyword);
}