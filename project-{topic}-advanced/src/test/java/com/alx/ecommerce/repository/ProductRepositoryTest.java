```java
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) // Use testcontainers DB
@ActiveProfiles("test")
class ProductRepositoryTest {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private TestEntityManager entityManager; // For direct DB operations in tests

    private Category electronicsCategory;
    private Category booksCategory;
    private Product laptop;
    private Product smartphone;
    private Product javaBook;

    @BeforeEach
    void setUp() {
        // Clear data from previous tests
        productRepository.deleteAll();
        categoryRepository.deleteAll();
        entityManager.clear();

        electronicsCategory = Category.builder().name("Electronics").description("Electronic gadgets").build();
        booksCategory = Category.builder().name("Books").description("All kinds of books").build();
        entityManager.persist(electronicsCategory);
        entityManager.persist(booksCategory);
        entityManager.flush(); // Ensure categories are saved and have IDs

        laptop = Product.builder()
                .name("Laptop X")
                .description("Powerful laptop")
                .price(new BigDecimal("1200.00"))
                .stockQuantity(50)
                .category(electronicsCategory)
                .imageUrl("http://example.com/laptop.jpg")
                .build();

        smartphone = Product.builder()
                .name("Smartphone Y")
                .description("Latest smartphone model")
                .price(new BigDecimal("800.00"))
                .stockQuantity(120)
                .category(electronicsCategory)
                .imageUrl("http://example.com/smartphone.jpg")
                .build();

        javaBook = Product.builder()
                .name("Effective Java")
                .description("A classic book for Java developers")
                .price(new BigDecimal("45.50"))
                .stockQuantity(80)
                .category(booksCategory)
                .imageUrl("http://example.com/javabook.jpg")
                .build();

        entityManager.persist(laptop);
        entityManager.persist(smartphone);
        entityManager.persist(javaBook);
        entityManager.flush();
    }

    @Test
    @DisplayName("Should find product by ID")
    void shouldFindProductById() {
        Optional<Product> foundProduct = productRepository.findById(laptop.getId());
        assertThat(foundProduct).isPresent();
        assertThat(foundProduct.get().getName()).isEqualTo("Laptop X");
    }

    @Test
    @DisplayName("Should find all products")
    void shouldFindAllProducts() {
        List<Product> products = productRepository.findAll();
        assertThat(products).hasSize(3);
    }

    @Test
    @DisplayName("Should save a new product")
    void shouldSaveNewProduct() {
        Category newCategory = Category.builder().name("Gaming").description("Gaming hardware").build();
        entityManager.persist(newCategory);
        entityManager.flush();

        Product newGameConsole = Product.builder()
                .name("Gaming Console Z")
                .description("Next-gen console")
                .price(new BigDecimal("500.00"))
                .stockQuantity(30)
                .category(newCategory)
                .imageUrl("http://example.com/console.jpg")
                .build();

        Product savedProduct = productRepository.save(newGameConsole);
        assertThat(savedProduct).isNotNull();
        assertThat(savedProduct.getId()).isNotNull();
        assertThat(savedProduct.getName()).isEqualTo("Gaming Console Z");

        Optional<Product> found = productRepository.findById(savedProduct.getId());
        assertThat(found).isPresent();
    }

    @Test
    @DisplayName("Should update an existing product")
    void shouldUpdateExistingProduct() {
        laptop.setPrice(new BigDecimal("1150.00"));
        laptop.setStockQuantity(45);
        Product updatedProduct = productRepository.save(laptop);

        assertThat(updatedProduct.getPrice()).isEqualByComparingTo("1150.00");
        assertThat(updatedProduct.getStockQuantity()).isEqualTo(45);

        Product fetchedProduct = productRepository.findById(laptop.getId()).get();
        assertThat(fetchedProduct.getPrice()).isEqualByComparingTo("1150.00");
    }

    @Test
    @DisplayName("Should delete a product by ID")
    void shouldDeleteProductById() {
        productRepository.deleteById(laptop.getId());
        Optional<Product> foundProduct = productRepository.findById(laptop.getId());
        assertThat(foundProduct).isNotPresent();
    }

    @Test
    @DisplayName("Should find products by category ID")
    void shouldFindProductsByCategoryId() {
        List<Product> electronicsProducts = productRepository.findByCategoryId(electronicsCategory.getId());
        assertThat(electronicsProducts).hasSize(2);
        assertThat(electronicsProducts).extracting(Product::getName).containsExactlyInAnyOrder("Laptop X", "Smartphone Y");

        List<Product> booksProducts = productRepository.findByCategoryId(booksCategory.getId());
        assertThat(booksProducts).hasSize(1);
        assertThat(booksProducts.get(0).getName()).isEqualTo("Effective Java");
    }

    @Test
    @DisplayName("Should find products by name containing keyword (case-insensitive)")
    void shouldFindProductsByNameContainingIgnoreCase() {
        List<Product> products = productRepository.findByNameContainingIgnoreCase("phone");
        assertThat(products).hasSize(1);
        assertThat(products.get(0).getName()).isEqualTo("Smartphone Y");

        products = productRepository.findByNameContainingIgnoreCase("lAP");
        assertThat(products).hasSize(1);
        assertThat(products.get(0).getName()).isEqualTo("Laptop X");
    }

    @Test
    @DisplayName("Should find products by category name")
    void shouldFindProductsByCategoryName() {
        List<Product> electronicsProducts = productRepository.findByCategoryName("Electronics");
        assertThat(electronicsProducts).hasSize(2);
        assertThat(electronicsProducts).extracting(Product::getName).containsExactlyInAnyOrder("Laptop X", "Smartphone Y");
    }

    @Test
    @DisplayName("Should find all products with pagination and sorting")
    void shouldFindAllProductsWithPaginationAndSorting() {
        PageRequest pageable = PageRequest.of(0, 2, Sort.by("name").ascending());
        Page<Product> productPage = productRepository.findAll(pageable);

        assertThat(productPage.getContent()).hasSize(2);
        assertThat(productPage.getTotalElements()).isEqualTo(3);
        assertThat(productPage.getTotalPages()).isEqualTo(2);
        assertThat(productPage.getContent().get(0).getName()).isEqualTo("Effective Java"); // Sorted alphabetically
        assertThat(productPage.getContent().get(1).getName()).isEqualTo("Laptop X");
    }

    @Test
    @DisplayName("Should find products with price less than a given value")
    void shouldFindProductsByPriceLessThan() {
        List<Product> expensiveProducts = productRepository.findByPriceLessThan(new BigDecimal("900.00"));
        assertThat(expensiveProducts).hasSize(2); // Smartphone (800), Effective Java (45.50)
        assertThat(expensiveProducts).extracting(Product::getName).containsExactlyInAnyOrder("Smartphone Y", "Effective Java");
    }
}
```