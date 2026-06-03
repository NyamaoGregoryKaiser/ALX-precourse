```java
package com.alx.pm.repository;

import com.alx.pm.entity.Category;
import com.alx.pm.entity.Product;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) // Disable default in-memory DB
class ProductRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("testuser")
            .withPassword("testpass");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop"); // For integration tests, allow create-drop
    }

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    private Category electronics;
    private Category books;

    @BeforeEach
    void setUp() {
        productRepository.deleteAll(); // Clear products
        categoryRepository.deleteAll(); // Clear categories

        electronics = new Category(null, "Electronics", LocalDateTime.now(), LocalDateTime.now());
        books = new Category(null, "Books", LocalDateTime.now(), LocalDateTime.now());
        electronics = categoryRepository.save(electronics);
        books = categoryRepository.save(books);

        Product laptop = new Product(null, "Laptop Pro", "High-performance laptop", 1200.0, 50, electronics, LocalDateTime.now(), LocalDateTime.now());
        Product keyboard = new Product(null, "Mechanical Keyboard", "RGB Mechanical Keyboard", 80.0, 100, electronics, LocalDateTime.now(), LocalDateTime.now());
        Product novel = new Product(null, "Classic Novel", "A timeless read", 15.0, 200, books, LocalDateTime.now(), LocalDateTime.now());

        productRepository.saveAll(List.of(laptop, keyboard, novel));
    }

    @Test
    void findByCriteria_noFilters_returnsAllProducts() {
        Pageable pageable = PageRequest.of(0, 10, Sort.by("name").ascending());
        Page<Product> products = productRepository.findByCriteria(null, null, null, null, pageable);

        assertThat(products).hasSize(3);
        assertThat(products.getContent().get(0).getName()).isEqualTo("Classic Novel"); // Sorted by name
    }

    @Test
    void findByCriteria_filterByName_returnsMatchingProducts() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Product> products = productRepository.findByCriteria("Laptop", null, null, null, pageable);

        assertThat(products).hasSize(1);
        assertThat(products.getContent().get(0).getName()).isEqualTo("Laptop Pro");
    }

    @Test
    void findByCriteria_filterByCategoryId_returnsMatchingProducts() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Product> products = productRepository.findByCriteria(null, electronics.getId(), null, null, pageable);

        assertThat(products).hasSize(2);
        assertThat(products.getContent()).extracting(Product::getName).containsExactlyInAnyOrder("Laptop Pro", "Mechanical Keyboard");
    }

    @Test
    void findByCriteria_filterByPriceRange_returnsMatchingProducts() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Product> products = productRepository.findByCriteria(null, null, 70.0, 100.0, pageable);

        assertThat(products).hasSize(1);
        assertThat(products.getContent().get(0).getName()).isEqualTo("Mechanical Keyboard");
    }

    @Test
    void findByCriteria_combinedFilters_returnsMatchingProducts() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Product> products = productRepository.findByCriteria("key", electronics.getId(), 50.0, 100.0, pageable);

        assertThat(products).hasSize(1);
        assertThat(products.getContent().get(0).getName()).isEqualTo("Mechanical Keyboard");
    }

    @Test
    void findByCriteria_noMatch_returnsEmptyPage() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Product> products = productRepository.findByCriteria("NonExistent", null, null, null, pageable);

        assertThat(products).isEmpty();
    }

    @Test
    void findByCategoryId_returnsProducts() {
        List<Product> products = productRepository.findByCategoryId(books.getId());
        assertThat(products).hasSize(1);
        assertThat(products.get(0).getName()).isEqualTo("Classic Novel");
    }
}
```