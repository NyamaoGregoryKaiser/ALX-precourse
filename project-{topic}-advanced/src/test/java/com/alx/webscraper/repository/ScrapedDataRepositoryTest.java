```java
package com.alx.webscraper.repository;

import com.alx.webscraper.auth.model.Role;
import com.alx.webscraper.auth.model.User;
import com.alx.webscraper.auth.repository.UserRepository;
import com.alx.webscraper.model.DataField;
import com.alx.webscraper.model.ScrapedData;
import com.alx.webscraper.model.ScrapingTask;
import com.alx.webscraper.model.ScrapingTaskStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
@ActiveProfiles("test")
class ScrapedDataRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("testuser")
            .withPassword("testpass");

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private ScrapedDataRepository scrapedDataRepository;

    @Autowired
    private UserRepository userRepository;

    private User user;
    private ScrapingTask task1;
    private ScrapingTask task2;

    @BeforeEach
    void setUp() {
        scrapedDataRepository.deleteAll();
        entityManager.clear(); // Clear persistence context to avoid issues with detached entities
        userRepository.deleteAll();
        
        user = new User(UUID.randomUUID(), "testuser", "pass", "test@example.com", Role.USER, LocalDateTime.now(), LocalDateTime.now());
        entityManager.persist(user);

        task1 = new ScrapingTask(null, "Task A", "http://example.com/a",
                List.of(new DataField("title", "h1", null)),
                ScrapingTaskStatus.COMPLETED, null, LocalDateTime.now(), LocalDateTime.now(), null, null, user);
        task2 = new ScrapingTask(null, "Task B", "http://example.com/b",
                List.of(new DataField("item", "li", null)),
                ScrapingTaskStatus.PENDING, null, LocalDateTime.now(), LocalDateTime.now(), null, null, user);

        entityManager.persist(task1);
        entityManager.persist(task2);
        entityManager.flush();
    }

    @Test
    void findByScrapingTask_ReturnsCorrectData() {
        // Given
        ScrapedData data1 = new ScrapedData(null, task1, Map.of("key1", "value1"), LocalDateTime.now(), "http://example.com/a");
        ScrapedData data2 = new ScrapedData(null, task1, Map.of("key2", "value2"), LocalDateTime.now().minusHours(1), "http://example.com/a");
        ScrapedData data3 = new ScrapedData(null, task2, Map.of("key3", "value3"), LocalDateTime.now().minusDays(1), "http://example.com/b");

        entityManager.persist(data1);
        entityManager.persist(data2);
        entityManager.persist(data3);
        entityManager.flush();

        // When
        List<ScrapedData> result = scrapedDataRepository.findByScrapingTask(task1);

        // Then
        assertThat(result).hasSize(2);
        assertThat(result).extracting(s -> s.getData().get("key1")).contains("value1");
        assertThat(result).extracting(s -> s.getData().get("key2")).contains("value2");
        assertThat(result).extracting(ScrapedData::getScrapingTask).containsOnly(task1);
    }

    @Test
    void findByScrapingTask_WithPagination_ReturnsCorrectPage() {
        // Given
        for (int i = 0; i < 5; i++) {
            entityManager.persist(new ScrapedData(null, task1, Map.of("item", "item" + i), LocalDateTime.now().minusMinutes(i), "http://example.com/a"));
        }
        entityManager.flush();

        Pageable pageable = PageRequest.of(0, 2); // First page, 2 items per page

        // When
        Page<ScrapedData> resultPage = scrapedDataRepository.findByScrapingTask(task1, pageable);

        // Then
        assertThat(resultPage).hasSize(2);
        assertThat(resultPage.getTotalElements()).isEqualTo(5);
        assertThat(resultPage.getTotalPages()).isEqualTo(3);
        assertThat(resultPage.getNumber()).isEqualTo(0);
    }

    @Test
    void deleteByScrapingTask_DeletesAllAssociatedData() {
        // Given
        ScrapedData data1 = new ScrapedData(null, task1, Map.of("key1", "value1"), LocalDateTime.now(), "http://example.com/a");
        ScrapedData data2 = new ScrapedData(null, task1, Map.of("key2", "value2"), LocalDateTime.now(), "http://example.com/a");
        ScrapedData data3 = new ScrapedData(null, task2, Map.of("key3", "value3"), LocalDateTime.now(), "http://example.com/b");

        entityManager.persist(data1);
        entityManager.persist(data2);
        entityManager.persist(data3);
        entityManager.flush();

        // Ensure data exists before deletion
        assertThat(scrapedDataRepository.count()).isEqualTo(3);

        // When
        long deletedCount = scrapedDataRepository.deleteByScrapingTask(task1);
        entityManager.flush(); // Ensure deletion is committed

        // Then
        assertThat(deletedCount).isEqualTo(2);
        assertThat(scrapedDataRepository.count()).isEqualTo(1); // Only data3 should remain
        assertThat(scrapedDataRepository.findByScrapingTask(task1)).isEmpty();
    }

    @Test
    void deleteByScrapingTask_NoDataToDelete_ReturnsZero() {
        // Given no data for task1
        ScrapedData data3 = new ScrapedData(null, task2, Map.of("key3", "value3"), LocalDateTime.now(), "http://example.com/b");
        entityManager.persist(data3);
        entityManager.flush();

        // When
        long deletedCount = scrapedDataRepository.deleteByScrapingTask(task1);
        entityManager.flush();

        // Then
        assertThat(deletedCount).isEqualTo(0);
        assertThat(scrapedDataRepository.count()).isEqualTo(1);
    }
}
```