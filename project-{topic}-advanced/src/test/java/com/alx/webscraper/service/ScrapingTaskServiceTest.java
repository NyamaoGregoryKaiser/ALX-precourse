```java
package com.alx.webscraper.service;

import com.alx.webscraper.auth.model.User;
import com.alx.webscraper.exception.ResourceNotFoundException;
import com.alx.webscraper.model.DataField;
import com.alx.webscraper.model.ScrapedData;
import com.alx.webscraper.model.ScrapingTask;
import com.alx.webscraper.model.ScrapingTaskStatus;
import com.alx.webscraper.model.dto.ScrapedDataDTO;
import com.alx.webscraper.model.dto.ScrapingTaskCreateDTO;
import com.alx.webscraper.model.dto.ScrapingTaskResponseDTO;
import com.alx.webscraper.model.dto.ScrapingTaskUpdateDTO;
import com.alx.webscraper.repository.ScrapedDataRepository;
import com.alx.webscraper.repository.ScrapingTaskRepository;
import com.alx.webscraper.scraper.ScraperScheduler;
import com.alx.webscraper.scraper.ScraperService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScrapingTaskServiceTest {

    @Mock
    private ScrapingTaskRepository scrapingTaskRepository;
    @Mock
    private ScrapedDataRepository scrapedDataRepository;
    @Mock
    private ScraperService scraperService;
    @Mock
    private ScraperScheduler scraperScheduler;

    @InjectMocks
    private ScrapingTaskService scrapingTaskService;

    private User testUser;
    private ScrapingTask sampleTask;
    private UUID taskId;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setUsername("testuser");
        testUser.setPassword("hashedpassword");

        taskId = UUID.randomUUID();
        sampleTask = new ScrapingTask(taskId, "Test Task", "http://example.com",
                List.of(new DataField("title", "h1", null)),
                ScrapingTaskStatus.PENDING, null, LocalDateTime.now(), LocalDateTime.now(), null, null, testUser);
    }

    @Test
    void createTask_Success_NoCron() {
        // Given
        ScrapingTaskCreateDTO createDTO = new ScrapingTaskCreateDTO("New Task", "http://new.com",
                List.of(new DataField("test", ".test", null)), null);

        when(scrapingTaskRepository.save(any(ScrapingTask.class))).thenReturn(sampleTask);

        // When
        ScrapingTaskResponseDTO result = scrapingTaskService.createTask(createDTO, testUser);

        // Then
        assertNotNull(result);
        assertEquals(sampleTask.getId(), result.getId());
        assertEquals(ScrapingTaskStatus.PENDING, result.getStatus());
        verify(scrapingTaskRepository, times(2)).save(any(ScrapingTask.class)); // Initial save + status update
        verify(scraperScheduler, never()).scheduleTask(any());
    }

    @Test
    void createTask_Success_WithCron() {
        // Given
        String cron = "0 0 12 * * ?";
        ScrapingTaskCreateDTO createDTO = new ScrapingTaskCreateDTO("New Task", "http://new.com",
                List.of(new DataField("test", ".test", null)), cron);
        ScrapingTask scheduledTask = new ScrapingTask(taskId, "New Task", "http://new.com",
                List.of(new DataField("test", ".test", null)),
                ScrapingTaskStatus.SCHEDULED, cron, LocalDateTime.now(), LocalDateTime.now(), null, null, testUser);


        when(scrapingTaskRepository.save(any(ScrapingTask.class)))
                .thenReturn(scheduledTask); // Mock both saves to return the same scheduledTask

        // When
        ScrapingTaskResponseDTO result = scrapingTaskService.createTask(createDTO, testUser);

        // Then
        assertNotNull(result);
        assertEquals(sampleTask.getId(), result.getId());
        assertEquals(ScrapingTaskStatus.SCHEDULED, result.getStatus());
        verify(scrapingTaskRepository, times(2)).save(any(ScrapingTask.class)); // Initial save + status update
        verify(scraperScheduler, times(1)).scheduleTask(any(ScrapingTask.class));
    }

    @Test
    void getTaskById_Success() {
        // Given
        when(scrapingTaskRepository.findByIdAndUser(taskId, testUser)).thenReturn(Optional.of(sampleTask));

        // When
        ScrapingTaskResponseDTO result = scrapingTaskService.getTaskById(taskId, testUser);

        // Then
        assertNotNull(result);
        assertEquals(taskId, result.getId());
        verify(scrapingTaskRepository, times(1)).findByIdAndUser(taskId, testUser);
    }

    @Test
    void getTaskById_NotFound_ThrowsException() {
        // Given
        when(scrapingTaskRepository.findByIdAndUser(taskId, testUser)).thenReturn(Optional.empty());

        // When / Then
        assertThrows(ResourceNotFoundException.class, () -> scrapingTaskService.getTaskById(taskId, testUser));
        verify(scrapingTaskRepository, times(1)).findByIdAndUser(taskId, testUser);
    }

    @Test
    void getAllTasksForUser_Success() {
        // Given
        List<ScrapingTask> tasks = List.of(sampleTask,
                new ScrapingTask(UUID.randomUUID(), "Task 2", "http://another.com", List.of(), ScrapingTaskStatus.PENDING, null, LocalDateTime.now(), LocalDateTime.now(), null, null, testUser));
        when(scrapingTaskRepository.findByUser(testUser)).thenReturn(tasks);

        // When
        List<ScrapingTaskResponseDTO> result = scrapingTaskService.getAllTasksForUser(testUser);

        // Then
        assertNotNull(result);
        assertEquals(2, result.size());
        verify(scrapingTaskRepository, times(1)).findByUser(testUser);
    }

    @Test
    void updateTask_Success_NoCronChange() {
        // Given
        ScrapingTaskUpdateDTO updateDTO = new ScrapingTaskUpdateDTO();
        updateDTO.setName("Updated Name");
        updateDTO.setStatus(ScrapingTaskStatus.COMPLETED);

        ScrapingTask updatedTask = new ScrapingTask(taskId, "Updated Name", "http://example.com",
                List.of(new DataField("title", "h1", null)),
                ScrapingTaskStatus.COMPLETED, null, LocalDateTime.now(), LocalDateTime.now(), null, null, testUser);

        when(scrapingTaskRepository.findByIdAndUser(taskId, testUser)).thenReturn(Optional.of(sampleTask));
        when(scrapingTaskRepository.save(any(ScrapingTask.class))).thenReturn(updatedTask);

        // When
        ScrapingTaskResponseDTO result = scrapingTaskService.updateTask(taskId, updateDTO, testUser);

        // Then
        assertNotNull(result);
        assertEquals("Updated Name", result.getName());
        assertEquals(ScrapingTaskStatus.COMPLETED, result.getStatus());
        verify(scrapingTaskRepository, times(1)).findByIdAndUser(taskId, testUser);
        verify(scrapingTaskRepository, times(1)).save(any(ScrapingTask.class));
        verify(scraperScheduler, never()).scheduleTask(any()); // No cron change, so not rescheduled
    }

    @Test
    void updateTask_Success_CronAdded() {
        // Given
        String newCron = "0 0 10 * * ?";
        ScrapingTaskUpdateDTO updateDTO = new ScrapingTaskUpdateDTO();
        updateDTO.setCronExpression(newCron);

        sampleTask.setStatus(ScrapingTaskStatus.PENDING); // Ensure initial state is not scheduled
        sampleTask.setCronExpression(null);

        ScrapingTask updatedTask = new ScrapingTask(taskId, "Test Task", "http://example.com",
                List.of(new DataField("title", "h1", null)),
                ScrapingTaskStatus.SCHEDULED, newCron, LocalDateTime.now(), LocalDateTime.now(), null, null, testUser);

        when(scrapingTaskRepository.findByIdAndUser(taskId, testUser)).thenReturn(Optional.of(sampleTask));
        when(scrapingTaskRepository.save(any(ScrapingTask.class))).thenReturn(updatedTask);

        // When
        ScrapingTaskResponseDTO result = scrapingTaskService.updateTask(taskId, updateDTO, testUser);

        // Then
        assertNotNull(result);
        assertEquals(newCron, result.getCronExpression());
        assertEquals(ScrapingTaskStatus.SCHEDULED, result.getStatus());
        verify(scrapingTaskRepository, times(1)).findByIdAndUser(taskId, testUser);
        verify(scrapingTaskRepository, times(1)).save(any(ScrapingTask.class));
        verify(scraperScheduler, times(1)).scheduleTask(updatedTask);
    }

    @Test
    void updateTask_Success_CronRemoved() {
        // Given
        String oldCron = "0 0 12 * * ?";
        sampleTask.setCronExpression(oldCron);
        sampleTask.setStatus(ScrapingTaskStatus.SCHEDULED);

        ScrapingTaskUpdateDTO updateDTO = new ScrapingTaskUpdateDTO();
        updateDTO.setCronExpression(null); // Remove cron

        ScrapingTask updatedTask = new ScrapingTask(taskId, "Test Task", "http://example.com",
                List.of(new DataField("title", "h1", null)),
                ScrapingTaskStatus.PENDING, null, LocalDateTime.now(), LocalDateTime.now(), null, null, testUser);


        when(scrapingTaskRepository.findByIdAndUser(taskId, testUser)).thenReturn(Optional.of(sampleTask));
        when(scrapingTaskRepository.save(any(ScrapingTask.class))).thenReturn(updatedTask);


        // When
        ScrapingTaskResponseDTO result = scrapingTaskService.updateTask(taskId, updateDTO, testUser);

        // Then
        assertNotNull(result);
        assertNull(result.getCronExpression());
        assertEquals(ScrapingTaskStatus.PENDING, result.getStatus());
        verify(scrapingTaskRepository, times(1)).findByIdAndUser(taskId, testUser);
        verify(scrapingTaskRepository, times(1)).save(any(ScrapingTask.class));
        verify(scraperScheduler, times(1)).unscheduleTask(taskId);
    }

    @Test
    void updateTask_NotFound_ThrowsException() {
        // Given
        ScrapingTaskUpdateDTO updateDTO = new ScrapingTaskUpdateDTO();
        when(scrapingTaskRepository.findByIdAndUser(taskId, testUser)).thenReturn(Optional.empty());

        // When / Then
        assertThrows(ResourceNotFoundException.class, () -> scrapingTaskService.updateTask(taskId, updateDTO, testUser));
        verify(scrapingTaskRepository, times(1)).findByIdAndUser(taskId, testUser);
        verify(scrapingTaskRepository, never()).save(any());
    }

    @Test
    void deleteTask_Success() {
        // Given
        when(scrapingTaskRepository.findByIdAndUser(taskId, testUser)).thenReturn(Optional.of(sampleTask));
        when(scrapedDataRepository.deleteByScrapingTask(sampleTask)).thenReturn(5L); // Simulate 5 records deleted
        doNothing().when(scrapingTaskRepository).delete(sampleTask);

        // When
        scrapingTaskService.deleteTask(taskId, testUser);

        // Then
        verify(scraperScheduler, times(1)).unscheduleTask(taskId);
        verify(scrapedDataRepository, times(1)).deleteByScrapingTask(sampleTask);
        verify(scrapingTaskRepository, times(1)).delete(sampleTask);
    }

    @Test
    void deleteTask_NotFound_ThrowsException() {
        // Given
        when(scrapingTaskRepository.findByIdAndUser(taskId, testUser)).thenReturn(Optional.empty());

        // When / Then
        assertThrows(ResourceNotFoundException.class, () -> scrapingTaskService.deleteTask(taskId, testUser));
        verify(scrapingTaskRepository, times(1)).findByIdAndUser(taskId, testUser);
        verify(scrapedDataRepository, never()).deleteByScrapingTask(any());
        verify(scrapingTaskRepository, never()).delete(any());
    }

    @Test
    void triggerTaskExecution_Success() throws IOException {
        // Given
        when(scrapingTaskRepository.findByIdAndUser(taskId, testUser)).thenReturn(Optional.of(sampleTask));
        when(scrapingTaskRepository.save(any(ScrapingTask.class))).thenReturn(sampleTask);
        doReturn(List.of(UUID.randomUUID())).when(scraperService).executeScrapingTask(sampleTask);

        // When
        ScrapingTaskResponseDTO result = scrapingTaskService.triggerTaskExecution(taskId, testUser);

        // Then
        assertNotNull(result);
        assertEquals(ScrapingTaskStatus.PENDING, result.getStatus()); // Should revert to original status
        assertTrue(result.getLastRunMessage().contains("completed successfully"));
        verify(scrapingTaskRepository, times(2)).save(any(ScrapingTask.class)); // Initial 'RUNNING' status, then final status
        verify(scraperService, times(1)).executeScrapingTask(sampleTask);
    }

    @Test
    void triggerTaskExecution_ScrapingFails_ThrowsIOException() throws IOException {
        // Given
        when(scrapingTaskRepository.findByIdAndUser(taskId, testUser)).thenReturn(Optional.of(sampleTask));
        when(scrapingTaskRepository.save(any(ScrapingTask.class))).thenReturn(sampleTask);
        doThrow(new IOException("Network error")).when(scraperService).executeScrapingTask(sampleTask);

        // When / Then
        IOException thrown = assertThrows(IOException.class, () -> scrapingTaskService.triggerTaskExecution(taskId, testUser));
        assertTrue(thrown.getMessage().contains("Network error"));

        verify(scrapingTaskRepository, times(2)).save(any(ScrapingTask.class)); // Initial 'RUNNING' status, then final 'FAILED' status
        verify(scraperService, times(1)).executeScrapingTask(sampleTask);
        assertEquals(ScrapingTaskStatus.FAILED, sampleTask.getStatus());
        assertTrue(sampleTask.getLastRunMessage().contains("Failed: Network error"));
    }

    @Test
    void getScrapedDataForTask_Success() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        ScrapedData scrapedDataItem = new ScrapedData(UUID.randomUUID(), sampleTask, Map.of("data1", "value1"), LocalDateTime.now(), "http://example.com");
        Page<ScrapedData> scrapedDataPage = new PageImpl<>(List.of(scrapedDataItem), pageable, 1);

        when(scrapingTaskRepository.findByIdAndUser(taskId, testUser)).thenReturn(Optional.of(sampleTask));
        when(scrapedDataRepository.findByScrapingTask(sampleTask, pageable)).thenReturn(scrapedDataPage);

        // When
        Page<ScrapedDataDTO> result = scrapingTaskService.getScrapedDataForTask(taskId, testUser, pageable);

        // Then
        assertNotNull(result);
        assertFalse(result.isEmpty());
        assertEquals(1, result.getTotalElements());
        assertEquals("value1", result.getContent().get(0).getData().get("data1"));
        verify(scrapingTaskRepository, times(1)).findByIdAndUser(taskId, testUser);
        verify(scrapedDataRepository, times(1)).findByScrapingTask(sampleTask, pageable);
    }

    @Test
    void getScrapedDataForTask_TaskNotFound_ThrowsException() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        when(scrapingTaskRepository.findByIdAndUser(taskId, testUser)).thenReturn(Optional.empty());

        // When / Then
        assertThrows(ResourceNotFoundException.class, () -> scrapingTaskService.getScrapedDataForTask(taskId, testUser, pageable));
        verify(scrapingTaskRepository, times(1)).findByIdAndUser(taskId, testUser);
        verify(scrapedDataRepository, never()).findByScrapingTask(any(ScrapingTask.class), any(Pageable.class));
    }
}
```