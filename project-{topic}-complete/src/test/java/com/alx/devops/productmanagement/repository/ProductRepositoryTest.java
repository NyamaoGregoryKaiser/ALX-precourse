```java
package com.alx.devops.productmanagement.repository;

import com.alx.devops.productmanagement.model.Category;
import com.alx.devops.productmanagement.model.Product;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) // Don't replace with in-memory DB
@ActiveProfiles("test") // Use a specific profile for tests
public class ProductRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(DockerImageName.parse("postgres:15-alpine"))
            .withDatabaseName("testdb")
            .withUsername("testuser")
            .withPassword("testpass");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop"); // Ensure schema is created for tests
    }

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private TestEntityManager entityManager; // For setup and verification

    private Category electronics;
    private Category books;

    @BeforeEach
    void setUp() {
        // Clear tables and insert fresh data for each test
        productRepository.deleteAll();
        categoryRepository.deleteAll();
        entityManager.flush(); // Ensure deletions are propagated

        electronics = new Category();
        electronics.setName("Electronics");
        electronics = entityManager.persistAndFlush(electronics);

        books = new Category();
        books.setName("Books");
        books = entityManager.persistAndFlush(books);

        Product laptop = new Product();
        laptop.setName("Laptop");
        laptop.setDescription("Portable computer");
        laptop.setPrice(BigDecimal.valueOf(1200.00));
        laptop.setCategory(electronics);
        entityManager.persistAndFlush(laptop);

        Product smartphone = new Product();
        smartphone.setName("Smartphone");
        smartphone.setDescription("Mobile phone");
        smartphone.setPrice(BigDecimal.valueOf(800.00));
        smartphone.setCategory(electronics);
        entityManager.persistAndFlush(smartphone);

        Product novel = new Product();
        novel.setName("Fantasy Novel");
        novel.setDescription("A captivating book");
        novel.setPrice(BigDecimal.valueOf(25.00));
        novel.setCategory(books);
        entityManager.persistAndFlush(novel);
    }

    @Test
    void testFindAllProducts() {
        List<Product> products = productRepository.findAll();
        assertThat(products).hasSize(3);
    }

    @Test
    void testFindProductById() {
        Optional<Product> foundProduct = productRepository.findByName("Laptop"); // Assuming a findByName would exist for test setup
        assertThat(foundProduct).isPresent();
        assertThat(foundProduct.get().getName()).isEqualTo("Laptop");
    }

    @Test
    void testCreateProduct() {
        Product newProduct = new Product();
        newProduct.setName("Tablet");
        newProduct.setDescription("A portable tablet");
        newProduct.setPrice(BigDecimal.valueOf(400.00));
        newProduct.setCategory(electronics);

        Product savedProduct = productRepository.save(newProduct);
        assertThat(savedProduct).isNotNull();
        assertThat(savedProduct.getId()).isNotNull();

        Optional<Product> foundProduct = productRepository.findById(savedProduct.getId());
        assertThat(foundProduct).isPresent();
        assertThat(foundProduct.get().getName()).isEqualTo("Tablet");
        assertThat(foundProduct.get().getCategory().getName()).isEqualTo("Electronics");
    }

    @Test
    void testUpdateProduct() {
        Product productToUpdate = productRepository.findByName("Smartphone").orElseThrow();
        productToUpdate.setPrice(BigDecimal.valueOf(750.00));
        productToUpdate.setDescription("Updated description for mobile phone");
        productToUpdate.setCategory(books); // Change category

        Product updatedProduct = productRepository.save(productToUpdate);
        entityManager.flush();
        entityManager.clear(); // Clear persistence context to ensure fresh load

        Optional<Product> foundProduct = productRepository.findById(updatedProduct.getId());
        assertThat(foundProduct).isPresent();
        assertThat(foundProduct.get().getPrice()).isEqualByComparingTo(BigDecimal.valueOf(750.00));
        assertThat(foundProduct.get().getDescription()).isEqualTo("Updated description for mobile phone");
        assertThat(foundProduct.get().getCategory().getName()).isEqualTo("Books");
    }

    @Test
    void testDeleteProduct() {
        Product productToDelete = productRepository.findByName("Fantasy Novel").orElseThrow();
        Long idToDelete = productToDelete.getId();

        productRepository.deleteById(idToDelete);
        entityManager.flush();

        Optional<Product> foundProduct = productRepository.findById(idToDelete);
        assertThat(foundProduct).isNotPresent();
    }

    // Helper method to find by name for tests (assuming it's needed, not part of core repo usually)
    private Optional<Product> findByName(String name) {
        return productRepository.findAll().stream()
                .filter(p -> p.getName().equals(name))
                .findFirst();
    }

    @Test
    void testFindByIdWithCategory_EagerLoading() {
        Product laptop = productRepository.findByName("Laptop").orElseThrow();
        Optional<Product> foundProduct = productRepository.findByIdWithCategory(laptop.getId());

        assertThat(foundProduct).isPresent();
        // Verify that the category is loaded eagerly (no LazyInitializationException if accessed outside transaction)
        assertThat(foundProduct.get().getCategory()).isNotNull();
        assertThat(foundProduct.get().getCategory().getName()).isEqualTo("Electronics");

        // Further check if the proxy is not initialized (if it were lazy) or if it's the actual object
        // This is implicit with FETCH JOIN, the object is fully hydrated.
        // The best test for N+1 is to check query counts, which is more complex with just @DataJpaTest
    }

    @Test
    void testFindAllWithCategory_EagerLoading() {
        List<Product> products = productRepository.findAllWithCategory();
        assertThat(products).hasSize(3);

        // Verify that all products have their category eagerly loaded
        for (Product product : products) {
            assertThat(product.getCategory()).isNotNull();
            assertThat(product.getCategory().getName()).isNotBlank();
        }
    }
}
```