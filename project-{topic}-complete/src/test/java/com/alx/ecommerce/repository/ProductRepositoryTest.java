package com.alx.ecommerce.repository;

import com.alx.ecommerce.model.Category;
import com.alx.ecommerce.model.Product;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for ProductRepository using Testcontainers and PostgreSQL.
 */
@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) // Don't replace our Testcontainers DB
class ProductRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop"); // Ensure clean schema for tests
    }

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private TestEntityManager entityManager; // For direct DB interaction in tests if needed

    private Category testCategory;

    @BeforeEach
    void setUp() {
        // Clear repositories before each test
        productRepository.deleteAll();
        categoryRepository.deleteAll();

        testCategory = Category.builder().name("Test Category").description("Category for testing").build();
        entityManager.persistAndFlush(testCategory); // Use entityManager to ensure it's in DB
    }

    @Test
    @DisplayName("Should save a product successfully")
    void shouldSaveProduct() {
        Product product = Product.builder()
                .name("Test Product")
                .description("A product for testing purposes.")
                .price(BigDecimal.valueOf(99.99))
                .stockQuantity(10)
                .category(testCategory)
                .build();

        Product savedProduct = productRepository.save(product);

        assertThat(savedProduct).isNotNull();
        assertThat(savedProduct.getId()).isNotNull();
        assertThat(savedProduct.getName()).isEqualTo("Test Product");
        assertThat(savedProduct.getCategory().getName()).isEqualTo("Test Category");
    }

    @Test
    @DisplayName("Should find product by ID with category")
    void shouldFindProductByIdWithCategory() {
        Product product = Product.builder()
                .name("Laptop")
                .description("Powerful laptop")
                .price(BigDecimal.valueOf(1200.00))
                .stockQuantity(5)
                .category(testCategory)
                .build();
        entityManager.persistAndFlush(product);

        Optional<Product> foundProduct = productRepository.findByIdWithCategory(product.getId());

        assertThat(foundProduct).isPresent();
        assertThat(foundProduct.get().getName()).isEqualTo("Laptop");
        assertThat(foundProduct.get().getCategory()).isNotNull();
        assertThat(foundProduct.get().getCategory().getName()).isEqualTo("Test Category");
    }

    @Test
    @DisplayName("Should find all products with categories")
    void shouldFindAllProductsWithCategories() {
        Category otherCategory = Category.builder().name("Other Category").description("Another category").build();
        entityManager.persistAndFlush(otherCategory);

        Product product1 = Product.builder().name("Item A").price(BigDecimal.TEN).stockQuantity(1).category(testCategory).description("Desc A").build();
        Product product2 = Product.builder().name("Item B").price(BigDecimal.ONE).stockQuantity(1).category(otherCategory).description("Desc B").build();
        entityManager.persistAndFlush(product1);
        entityManager.persistAndFlush(product2);

        List<Product> products = productRepository.findAllWithCategories();

        assertThat(products).hasSize(2);
        assertThat(products).extracting(Product::getName).containsExactlyInAnyOrder("Item A", "Item B");
        assertThat(products).extracting(p -> p.getCategory().getName()).containsExactlyInAnyOrder("Test Category", "Other Category");
    }

    @Test
    @DisplayName("Should search products by query in name or description")
    void shouldSearchProductsByQuery() {
        Product product1 = Product.builder().name("Smart TV 55").description("High definition television").price(BigDecimal.valueOf(800)).stockQuantity(10).category(testCategory).build();
        Product product2 = Product.builder().name("Bluetooth Speaker").description("Portable audio device").price(BigDecimal.valueOf(50)).stockQuantity(20).category(testCategory).build();
        Product product3 = Product.builder().name("Smartwatch").description("Wearable tech").price(BigDecimal.valueOf(250)).stockQuantity(15).category(testCategory).build();

        entityManager.persistAndFlush(product1);
        entityManager.persistAndFlush(product2);
        entityManager.persistAndFlush(product3);

        List<Product> searchResults = productRepository.searchProducts("smart");
        assertThat(searchResults).hasSize(2);
        assertThat(searchResults).extracting(Product::getName).containsExactlyInAnyOrder("Smart TV 55", "Smartwatch");

        searchResults = productRepository.searchProducts("audio");
        assertThat(searchResults).hasSize(1);
        assertThat(searchResults.get(0).getName()).isEqualTo("Bluetooth Speaker");
    }

    @Test
    @DisplayName("Should find products by category ID")
    void shouldFindProductsByCategoryId() {
        Category electronics = Category.builder().name("Electronics").build();
        Category books = Category.builder().name("Books").build();
        entityManager.persistAndFlush(electronics);
        entityManager.persistAndFlush(books);

        Product laptop = Product.builder().name("Laptop").description("").price(BigDecimal.valueOf(1000)).stockQuantity(10).category(electronics).build();
        Product mouse = Product.builder().name("Mouse").description("").price(BigDecimal.valueOf(20)).stockQuantity(50).category(electronics).build();
        Product novel = Product.builder().name("Novel").description("").price(BigDecimal.valueOf(15)).stockQuantity(30).category(books).build();

        entityManager.persistAndFlush(laptop);
        entityManager.persistAndFlush(mouse);
        entityManager.persistAndFlush(novel);

        List<Product> electronicsProducts = productRepository.findByCategoryId(electronics.getId());
        assertThat(electronicsProducts).hasSize(2);
        assertThat(electronicsProducts).extracting(Product::getName).containsExactlyInAnyOrder("Laptop", "Mouse");

        List<Product> bookProducts = productRepository.findByCategoryId(books.getId());
        assertThat(bookProducts).hasSize(1);
        assertThat(bookProducts.get(0).getName()).isEqualTo("Novel");
    }
}