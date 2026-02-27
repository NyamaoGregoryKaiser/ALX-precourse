```java
package com.alx.webscraper.repository;

import com.alx.webscraper.auth.model.Role;
import com.alx.webscraper.auth.model.User;
import com.alx.webscraper.auth.repository.UserRepository;
import com.alx.webscraper.model.DataField;
import com.alx.webscraper.model.ScrapingTask;
import com.alx.webscraper.model.ScrapingTaskStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.containers.PostgreSQLContainer;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) // Use testcontainers instead of in-memory DB
@Testcontainers
@ActiveProfiles("test") // Use a test profile if you have specific configurations
class ScrapingTaskRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("testuser")
            .withPassword("testpass");

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private ScrapingTaskRepository scrapingTaskRepository;

    @Autowired
    private UserRepository userRepository; // To persist users for tasks

    private User user1;
    private User user2;

    @BeforeEach
    void setUp() {
        // Clear previous data
        scrapingTaskRepository.deleteAll();
        userRepository.deleteAll();

        // Create and persist users
        user1 = new User(UUID.randomUUID(), "testuser1", "pass1", "user1@example.com", Role.USER, LocalDateTime.now(), LocalDateTime.now());
        user2 = new User(UUID.randomUUID(), "testuser2", "pass2", "user2@example.com", Role.USER, LocalDateTime.now(), LocalDateTime.now());
        entityManager.persist(user1);
        entityManager.persist(user2);
        entityManager.flush();
    }

    @Test
    void findByUser_ReturnsTasksForUser() {
        // Given
        ScrapingTask task1 = new ScrapingTask(null, "User1 Task1", "http://example.com/u1t1",
                List.of(new DataField("field1", "h1", null)),
                ScrapingTaskStatus.PENDING, null, LocalDateTime.now(), LocalDateTime.now(), null, null, user1);
        ScrapingTask task2 = new ScrapingTask(null, "User1 Task2", "http://example.com/u1t2",
                List.of(new DataField("field2", "p", null)),
                ScrapingTaskStatus.SCHEDULED, "0 0 1 * * ?", LocalDateTime.now(), LocalDateTime.now(), null, null, user1);
        ScrapingTask task3 = new ScrapingTask(null, "User2 Task1", "http://example.com/u2t1",
                List.of(new DataField("field3", "div", null)),
                ScrapingTaskStatus.PENDING, null, LocalDateTime.now(), LocalDateTime.now(), null, null, user2);

        entityManager.persist(task1);
        entityManager.persist(task2);
        entityManager.persist(task3);
        entityManager.flush();

        // When
        List<ScrapingTask> user1Tasks = scrapingTaskRepository.findByUser(user1);
        List<ScrapingTask> user2Tasks = scrapingTaskRepository.findByUser(user2);

        // Then
        assertThat(user1Tasks).hasSize(2);
        assertThat(user1Tasks).extracting(ScrapingTask::getName).containsExactlyInAnyOrder("User1 Task1", "User1 Task2");
        assertThat(user2Tasks).hasSize(1);
        assertThat(user2Tasks).extracting(ScrapingTask::getName).containsExactly("User2 Task1");
    }

    @Test
    void findByIdAndUser_ReturnsTaskIfOwned() {
        // Given
        ScrapingTask task = new ScrapingTask(null, "User1 Specific Task", "http://example.com/specific",
                List.of(new DataField("field", "span", null)),
                ScrapingTaskStatus.PENDING, null, LocalDateTime.now(), LocalDateTime.now(), null, null, user1);
        entityManager.persist(task);
        entityManager.flush();

        // When
        Optional<ScrapingTask> foundTask = scrapingTaskRepository.findByIdAndUser(task.getId(), user1);

        // Then
        assertThat(foundTask).isPresent();
        assertThat(foundTask.get().getName()).isEqualTo("User1 Specific Task");
    }

    @Test
    void findByIdAndUser_ReturnsEmptyIfNotOwned() {
        // Given
        ScrapingTask task = new ScrapingTask(null, "User1 Specific Task", "http://example.com/specific",
                List.of(new DataField("field", "span", null)),
                ScrapingTaskStatus.PENDING, null, LocalDateTime.now(), LocalDateTime.now(), null, null, user1);
        entityManager.persist(task);
        entityManager.flush();

        // When
        Optional<ScrapingTask> foundTask = scrapingTaskRepository.findByIdAndUser(task.getId(), user2); // Query with wrong user

        // Then
        assertThat(foundTask).isEmpty();
    }

    @Test
    void findByStatusAndCronExpressionIsNotNull_ReturnsScheduledTasks() {
        // Given
        ScrapingTask scheduledTask1 = new ScrapingTask(null, "Scheduled Task1", "http://example.com/sch1",
                List.of(new DataField("sch", "p", null)),
                ScrapingTaskStatus.SCHEDULED, "0 0 1 * * ?", LocalDateTime.now(), LocalDateTime.now(), null, null, user1);
        ScrapingTask scheduledTask2 = new ScrapingTask(null, "Scheduled Task2", "http://example.com/sch2",
                List.of(new DataField("sch", "p", null)),
                ScrapingTaskStatus.SCHEDULED, "0 30 2 * * ?", LocalDateTime.now(), LocalDateTime.now(), null, null, user2);
        ScrapingTask pendingTask = new ScrapingTask(null, "Pending Task", "http://example.com/pen",
                List.of(new DataField("pen", "p", null)),
                ScrapingTaskStatus.PENDING, null, LocalDateTime.now(), LocalDateTime.now(), null, null, user1);
        ScrapingTask failedTask = new ScrapingTask(null, "Failed Task", "http://example.com/fail",
                List.of(new DataField("fail", "p", null)),
                ScrapingTaskStatus.FAILED, "0 0 3 * * ?", LocalDateTime.now(), LocalDateTime.now(), null, null, user1);


        entityManager.persist(scheduledTask1);
        entityManager.persist(scheduledTask2);
        entityManager.persist(pendingTask);
        entityManager.persist(failedTask);
        entityManager.flush();

        // When
        List<ScrapingTask> foundTasks = scrapingTaskRepository.findByStatusAndCronExpressionIsNotNull(ScrapingTaskStatus.SCHEDULED);

        // Then
        assertThat(foundTasks).hasSize(2);
        assertThat(foundTasks).extracting(ScrapingTask::getName).containsExactlyInAnyOrder("Scheduled Task1", "Scheduled Task2");
        assertThat(foundTasks).noneMatch(task -> task.getCronExpression() == null || task.getCronExpression().isBlank());
    }
}
```