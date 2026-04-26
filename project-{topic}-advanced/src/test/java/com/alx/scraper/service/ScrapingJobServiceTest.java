package com.alx.scraper.service;

import com.alx.scraper.dto.ScrapingJobCreateRequest;
import com.alx.scraper.exception.ResourceNotFoundException;
import com.alx.scraper.model.ScrapedData;
import com.alx.scraper.model.ScrapingJob;
import com.alx.scraper.model.User;
import com.alx.scraper.repository.ScrapedDataRepository;
import com.alx.scraper.repository.ScrapingJobRepository;
import com.alx.scraper.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.Trigger;
import org.springframework.scheduling.support.CronTrigger;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ScheduledFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link ScrapingJobService}.
 * Focuses on testing the business logic, job creation, scheduling, and data handling
 * in isolation using Mockito.
 *
 * ALX Focus: Critical for validating business logic and interactions between services/repositories.
 * Tests ensure correct data flow, error handling, and scheduling mechanisms.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ScrapingJobService Unit Tests")
class ScrapingJobServiceTest {

    @Mock
    private ScrapingJobRepository scrapingJobRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ScrapedDataRepository scrapedDataRepository;
    @Mock
    private ScrapingService scrapingService;
    @Mock
    private TaskScheduler taskScheduler;
    @Mock
    private ScheduledFuture<?> scheduledFuture; // Mock for the return type of taskScheduler.schedule

    @InjectMocks
    private ScrapingJobService scrapingJobService;

    private User testUser;
    private ScrapingJob testJob;
    private ScrapingJobCreateRequest createRequest;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");

        testJob = new ScrapingJob();
        testJob.setId(101L);
        testJob.setUser(testUser);
        testJob.setName("Test Job");
        testJob.setTargetUrl("http://example.com");
        testJob.setCssSelector("h1");
        testJob.setStatus(ScrapingJob.JobStatus.ACTIVE);
        testJob.setScheduleCron("0 0 * * * *");

        createRequest = new ScrapingJobCreateRequest();
        createRequest.setName("New Job");
        createRequest.setTargetUrl("http://newexample.com");
        createRequest.setCssSelector("p.content");
        createRequest.setScheduleCron("0 30 * * * *");

        // Mock TaskScheduler to return a mock ScheduledFuture
        when(taskScheduler.schedule(any(Runnable.class), any(Trigger.class))).thenReturn(scheduledFuture);
    }

    @Test
    @DisplayName("Should create a new scraping job successfully and schedule it")
    void whenCreateScrapingJob_thenJobIsSavedAndScheduled() {
        // Given
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(scrapingJobRepository.save(any(ScrapingJob.class))).thenReturn(testJob);

        // When
        ScrapingJob result = scrapingJobService.createScrapingJob(testUser.getId(), createRequest);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo(testJob.getName()); // It should return the mocked saved job
        assertThat(result.getStatus()).isEqualTo(ScrapingJob.JobStatus.ACTIVE);
        verify(scrapingJobRepository, times(1)).save(any(ScrapingJob.class));
        verify(taskScheduler, times(1)).schedule(any(Runnable.class), any(CronTrigger.class));
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when creating job for non-existent user")
    void whenCreateScrapingJob_withNonExistentUser_thenThrowResourceNotFoundException() {
        // Given
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());

        // When / Then
        assertThrows(ResourceNotFoundException.class, () ->
                scrapingJobService.createScrapingJob(999L, createRequest)
        );
        verify(scrapingJobRepository, never()).save(any(ScrapingJob.class));
        verify(taskScheduler, never()).schedule(any(Runnable.class), any(Trigger.class));
    }

    @Test
    @DisplayName("Should retrieve a scraping job by ID for the correct user")
    void whenGetScrapingJobById_thenReturnsJob() {
        // Given
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(scrapingJobRepository.findByIdAndUser(testJob.getId(), testUser)).thenReturn(Optional.of(testJob));

        // When
        ScrapingJob result = scrapingJobService.getScrapingJobById(testJob.getId(), testUser.getId());

        // Then
        assertThat(result).isEqualTo(testJob);
        verify(scrapingJobRepository, times(1)).findByIdAndUser(testJob.getId(), testUser);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when getting job by ID for non-existent job")
    void whenGetScrapingJobById_withNonExistentJob_thenThrowResourceNotFoundException() {
        // Given
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(scrapingJobRepository.findByIdAndUser(anyLong(), any(User.class))).thenReturn(Optional.empty());

        // When / Then
        assertThrows(ResourceNotFoundException.class, () ->
                scrapingJobService.getScrapingJobById(999L, testUser.getId())
        );
    }

    @Test
    @DisplayName("Should update an existing scraping job and reschedule it")
    void whenUpdateScrapingJob_thenJobIsUpdatedAndRescheduled() {
        // Given
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(scrapingJobRepository.findByIdAndUser(testJob.getId(), testUser)).thenReturn(Optional.of(testJob));
        when(scrapingJobRepository.save(any(ScrapingJob.class))).thenReturn(testJob);

        ScrapingJobCreateRequest updateRequest = new ScrapingJobCreateRequest();
        updateRequest.setName("Updated Job");
        updateRequest.setTargetUrl("http://updated.com");
        updateRequest.setCssSelector("div.updated");
        updateRequest.setScheduleCron("0 15 * * * *");

        // When
        ScrapingJob result = scrapingJobService.updateScrapingJob(testJob.getId(), testUser.getId(), updateRequest);

        // Then
        assertThat(result.getName()).isEqualTo("Updated Job");
        assertThat(result.getTargetUrl()).isEqualTo("http://updated.com");
        assertThat(result.getCssSelector()).isEqualTo("div.updated");
        assertThat(result.getScheduleCron()).isEqualTo("0 15 * * * *");

        verify(scrapingJobRepository, times(1)).save(testJob);
        // Verify unschedule (previous cron) and schedule (new cron) were called
        verify(scheduledFuture, times(1)).cancel(true); // From unscheduleJob
        verify(taskScheduler, times(1)).schedule(any(Runnable.class), any(CronTrigger.class)); // From scheduleJob
    }

    @Test
    @DisplayName("Should delete a scraping job and unschedule it")
    void whenDeleteScrapingJob_thenJobIsDeletedAndUnscheduled() {
        // Given
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(scrapingJobRepository.findByIdAndUser(testJob.getId(), testUser)).thenReturn(Optional.of(testJob));

        // When
        scrapingJobService.deleteScrapingJob(testJob.getId(), testUser.getId());

        // Then
        verify(scrapingJobRepository, times(1)).delete(testJob);
        verify(scheduledFuture, times(1)).cancel(true); // Verify unscheduleJob was called
    }

    @Test
    @DisplayName("Should trigger a scraping job and save scraped data")
    void whenTriggerScrapingJob_thenScrapingIsExecutedAndDataSaved() throws IOException {
        // Given
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(scrapingJobRepository.findByIdAndUser(testJob.getId(), testUser)).thenReturn(Optional.of(testJob));

        List<Map<String, String>> scrapedItems = List.of(Map.of("text", "Scraped Content"));
        String jsonResult = "[{\"text\":\"Scraped Content\"}]";

        when(scrapingService.scrape(testJob.getTargetUrl(), testJob.getCssSelector())).thenReturn(scrapedItems);
        when(scrapingService.convertToJson(scrapedItems)).thenReturn(jsonResult);
        when(scrapingJobRepository.save(any(ScrapingJob.class))).thenReturn(testJob); // Mock saving job status
        when(scrapedDataRepository.save(any(ScrapedData.class))).thenReturn(new ScrapedData()); // Mock saving scraped data

        // When
        ScrapingJob result = scrapingJobService.triggerScrapingJob(testJob.getId(), testUser.getId());

        // Then
        assertThat(result.getStatus()).isEqualTo(ScrapingJob.JobStatus.COMPLETED);
        verify(scrapingService, times(1)).scrape(testJob.getTargetUrl(), testJob.getCssSelector());
        verify(scrapingService, times(1)).convertToJson(scrapedItems);
        verify(scrapedDataRepository, times(1)).save(any(ScrapedData.class));

        // Verify that job status was updated twice: to RUNNING and then to COMPLETED
        ArgumentCaptor<ScrapingJob> jobCaptor = ArgumentCaptor.forClass(ScrapingJob.class);
        verify(scrapingJobRepository, atLeast(2)).save(jobCaptor.capture());

        List<ScrapingJob> savedJobs = jobCaptor.getAllValues();
        assertThat(savedJobs.get(0).getStatus()).isEqualTo(ScrapingJob.JobStatus.RUNNING);
        assertThat(savedJobs.get(savedJobs.size() - 1).getStatus()).isEqualTo(ScrapingJob.JobStatus.COMPLETED);
    }

    @Test
    @DisplayName("Should mark job as FAILED if scraping throws IOException")
    void whenExecuteScrapingJob_onIOException_thenJobStatusIsFailed() throws IOException {
        // Given
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(scrapingJobRepository.findByIdAndUser(testJob.getId(), testUser)).thenReturn(Optional.of(testJob));
        when(scrapingJobRepository.save(any(ScrapingJob.class))).thenReturn(testJob); // Mock saving job status
        doThrow(new IOException("Scraping failed")).when(scrapingService).scrape(anyString(), anyString());

        // When
        scrapingJobService.executeScrapingJob(testJob);

        // Then
        verify(scrapingService, times(1)).scrape(anyString(), anyString());
        // Verify job status was updated to FAILED
        ArgumentCaptor<ScrapingJob> jobCaptor = ArgumentCaptor.forClass(ScrapingJob.class);
        verify(scrapingJobRepository, atLeast(2)).save(jobCaptor.capture());

        List<ScrapingJob> savedJobs = jobCaptor.getAllValues();
        assertThat(savedJobs.get(0).getStatus()).isEqualTo(ScrapingJob.JobStatus.RUNNING);
        assertThat(savedJobs.get(savedJobs.size() - 1).getStatus()).isEqualTo(ScrapingJob.JobStatus.FAILED);
    }

    @Test
    @DisplayName("Should get paginated scraped data for a job")
    void whenGetScrapedDataForJob_thenReturnsPaginatedData() {
        // Given
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(scrapingJobRepository.findByIdAndUser(testJob.getId(), testUser)).thenReturn(Optional.of(testJob));

        ScrapedData data1 = new ScrapedData(1L, testJob, "{}", LocalDateTime.now());
        ScrapedData data2 = new ScrapedData(2L, testJob, "{}", LocalDateTime.now());
        List<ScrapedData> dataList = List.of(data1, data2);
        Pageable pageable = PageRequest.of(0, 10);
        Page<ScrapedData> page = new PageImpl<>(dataList, pageable, dataList.size());

        when(scrapedDataRepository.findByScrapingJob(testJob, pageable)).thenReturn(page);

        // When
        Page<ScrapedData> resultPage = scrapingJobService.getScrapedDataForJob(testJob.getId(), testUser.getId(), pageable);

        // Then
        assertThat(resultPage).isNotNull();
        assertThat(resultPage.getContent()).hasSize(2);
        verify(scrapedDataRepository, times(1)).findByScrapingJob(testJob, pageable);
    }

    @Test
    @DisplayName("Should return all active jobs")
    void whenGetActiveScrapingJobs_thenReturnsListOfActiveJobs() {
        // Given
        when(scrapingJobRepository.findByStatus(ScrapingJob.JobStatus.ACTIVE)).thenReturn(List.of(testJob));

        // When
        List<ScrapingJob> activeJobs = scrapingJobService.getActiveScrapingJobs();

        // Then
        assertThat(activeJobs).hasSize(1);
        assertThat(activeJobs.get(0).getId()).isEqualTo(testJob.getId());
        verify(scrapingJobRepository, times(1)).findByStatus(ScrapingJob.JobStatus.ACTIVE);
    }

    @Test
    @DisplayName("Should not schedule job if cron is null or empty when creating")
    void whenCreateScrapingJob_withoutCron_thenJobIsNotScheduled() {
        // Given
        createRequest.setScheduleCron(null);
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(scrapingJobRepository.save(any(ScrapingJob.class))).thenReturn(testJob);

        // When
        scrapingJobService.createScrapingJob(testUser.getId(), createRequest);

        // Then
        verify(taskScheduler, never()).schedule(any(Runnable.class), any(Trigger.class));
    }
}
```