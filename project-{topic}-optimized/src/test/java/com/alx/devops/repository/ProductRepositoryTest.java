package com.alx.devops.repository;

import com.alx.devops.model.Category;
import com.alx.devops.model.Product;
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
 * Integration tests for {@link ProductRepository}.
 * Uses {@link DataJpaTest} to focus on JPA components and {@link Testcontainers}
 * to run tests against a real PostgreSQL database.
 */
@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) // Disable in-memory H2, use Testcontainers
@DisplayName("ProductRepository Integration Tests")
class ProductRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLgreSQLContainer("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("testuser")
            .withPassword("testpass");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop"); // Ensure clean schema for each run
    }

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository; // To set up test data

    @Autowired
    private TestEntityManager entityManager; // For direct entity management if needed

    private Category electronicsCategory;
    private Product laptopProduct;

    @BeforeEach
    void setUp() {
        // Clear data before each test
        productRepository.deleteAll();
        categoryRepository.deleteAll();
        entityManager.clear();

        electronicsCategory = new Category(null, "Electronics", "Devices", null);
        entityManager.persistAndFlush(electronicsCategory);

        laptopProduct = new Product(null, "Laptop X", "High-end laptop", new BigDecimal("1500.00"), 10, electronicsCategory);
        entityManager.persistAndFlush(laptopProduct);
    }

    @Test
    @DisplayName("Should find product by ID")
    void findById_shouldReturnProduct_whenFound() {
        Optional<Product> foundProduct = productRepository.findById(laptopProduct.getId());

        assertThat(foundProduct).isPresent();
        assertThat(foundProduct.get().getName()).isEqualTo("Laptop X");
        assertThat(foundProduct.get().getCategory().getName()).isEqualTo("Electronics");
    }

    @Test
    @DisplayName("Should return empty when product by ID is not found")
    void findById_shouldReturnEmpty_whenNotFound() {
        Optional<Product> foundProduct = productRepository.findById(999L);
        assertThat(foundProduct).isEmpty();
    }

    @Test
    @DisplayName("Should save a product")
    void save_shouldPersistProduct() {
        Category booksCategory = new Category(null, "Books", "Reading materials", null);
        entityManager.persistAndFlush(booksCategory);

        Product newProduct = new Product(null, "The DevOps Way", "A book on modern software delivery", new BigDecimal("29.99"), 50, booksCategory);
        Product savedProduct = productRepository.save(newProduct);

        assertThat(savedProduct).isNotNull();
        assertThat(savedProduct.getId()).isNotNull();
        assertThat(savedProduct.getName()).isEqualTo("The DevOps Way");
        assertThat(savedProduct.getCategory().getName()).isEqualTo("Books");

        Optional<Product> found = productRepository.findById(savedProduct.getId());
        assertThat(found).isPresent();
    }

    @Test
    @DisplayName("Should update a product")
    void update_shouldModifyProduct() {
        laptopProduct.setPrice(new BigDecimal("1400.00"));
        laptopProduct.setStockQuantity(8);
        Product updatedProduct = productRepository.save(laptopProduct);

        assertThat(updatedProduct.getPrice()).isEqualTo(new BigDecimal("1400.00"));
        assertThat(updatedProduct.getStockQuantity()).isEqualTo(8);

        Optional<Product> found = productRepository.findById(laptopProduct.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getPrice()).isEqualTo(new BigDecimal("1400.00"));
    }

    @Test
    @DisplayName("Should delete a product")
    void delete_shouldRemoveProduct() {
        productRepository.deleteById(laptopProduct.getId());

        Optional<Product> found = productRepository.findById(laptopProduct.getId());
        assertThat(found).isEmpty();
    }

    @Test
    @DisplayName("Should find products by category ID")
    void findByCategoryId_shouldReturnProductsInGivenCategory() {
        Category kitchenCategory = new Category(null, "Kitchen", "Cooking items", null);
        entityManager.persistAndFlush(kitchenCategory);

        Product blender = new Product(null, "Blender", "Smoothie maker", new BigDecimal("70.00"), 20, kitchenCategory);
        Product toaster = new Product(null, "Toaster", "Bread toaster", new BigDecimal("30.00"), 30, kitchenCategory);
        entityManager.persistAndFlush(blender);
        entityManager.persistAndFlush(toaster);

        List<Product> electronicsProducts = productRepository.findByCategoryId(electronicsCategory.getId());
        List<Product> kitchenProducts = productRepository.findByCategoryId(kitchenCategory.getId());

        assertThat(electronicsProducts).hasSize(1);
        assertThat(electronicsProducts.get(0).getName()).isEqualTo("Laptop X");
        assertThat(kitchenProducts).hasSize(2);
        assertThat(kitchenProducts).extracting(Product::getName).containsExactlyInAnyOrder("Blender", "Toaster");
    }

    @Test
    @DisplayName("Should find products by name containing keyword (case-insensitive)")
    void findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase_shouldReturnMatchingProducts() {
        Product keyboard = new Product(null, "Wireless Keyboard", "Ergonomic design", new BigDecimal("80.00"), 25, electronicsCategory);
        Product monitor = new Product(null, "4K Monitor", "High resolution display", new BigDecimal("350.00"), 15, electronicsCategory);
        entityManager.persistAndFlush(keyboard);
        entityManager.persistAndFlush(monitor);

        List<Product> results = productRepository.findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase("key", "key");
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getName()).isEqualTo("Wireless Keyboard");

        results = productRepository.findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase("HIGH", "HIGH");
        assertThat(results).hasSize(2); // Laptop X (High-end), 4K Monitor (High resolution)
        assertThat(results).extracting(Product::getName).containsExactlyInAnyOrder("Laptop X", "4K Monitor");

        results = productRepository.findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase("display", "display");
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getName()).isEqualTo("4K Monitor");
    }
}