```java
package com.alx.scrapineer.scheduler;

import com.alx.scrapineer.data.entity.JobStatus;
import com.alx.scrapineer.data.entity.Role;
import com.alx.scrapineer.data.entity.ScrapingJob;
import com.alx.scrapineer.data.entity.ScrapingTarget;
import com.alx.scrapineer.data.entity.User;
import com.alx.scrapineer.data.repository.ScrapingJobRepository;
import com.alx.scrapineer.scraper.service.ScrapingOrchestrationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScrapingJobSchedulerTest {

    @Mock
    private ScrapingJobRepository jobRepository;
    @Mock
    private ScrapingOrchestrationService orchestrationService;

    @InjectMocks
    private ScrapingJobScheduler jobScheduler;

    private User testUser;
    private ScrapingTarget testTarget;
    private ScrapingJob scheduledJob;
    private ScrapingJob manualJob;

    @BeforeEach
    void setUp() {
        testUser = User.builder().id(1L).username("testuser").password("pass").roles(Set.of(Role.USER)).build();
        testTarget = ScrapingTarget.builder().id(10L).user(testUser).name("Test Target").url("http://example.com").active(true).build();

        scheduledJob = ScrapingJob.builder()
                .id(1L)
                .user(testUser)
                .target(testTarget)
                .status(JobStatus.SCHEDULED)
                .scheduleCron("0 0/1 * * * *") // Every minute
                .nextRunAt(LocalDateTime.now().minusMinutes(5)) // Should be due
                .build();

        manualJob = ScrapingJob.builder()
                .id(2L)
                .user(testUser)
                .target(testTarget)
                .status(JobStatus.CREATED)
                .scheduleCron(null)
                .build();

        // Enable scheduler for tests by default
        ReflectionTestUtils.setField(jobScheduler, "schedulerEnabled", true);
    }

    @Test
    void testScheduleScrapingJobs_DueJobsFound() {
        when(jobRepository.findDueScheduledJobs(any(LocalDateTime.class))).thenReturn(List.of(scheduledJob));
        when(jobRepository.save(any(ScrapingJob.class))).thenAnswer(invocation -> invocation.getArgument(0));
        doNothing().when(orchestrationService).executeScrapingJob(any(ScrapingJob.class));

        jobScheduler.scheduleScrapingJobs();

        verify(jobRepository, times(1)).findDueScheduledJobs(any(LocalDateTime.class));
        verify(jobScheduler, times(1)).updateJobNextRunTime(scheduledJob); // Called during scheduling logic
        verify(jobRepository, times(2)).save(any(ScrapingJob.class)); // One for nextRunAt update, one from orchestrationService
        verify(orchestrationService, times(1)).executeScrapingJob(scheduledJob);

        assertThat(scheduledJob.getNextRunAt()).isAfter(LocalDateTime.now().minusMinutes(1));
        assertThat(scheduledJob.getStatus()).isEqualTo(JobStatus.SCHEDULED); // orchestrationService would update to RUNNING/COMPLETED/FAILED
    }

    @Test
    void testScheduleScrapingJobs_NoDueJobs() {
        when(jobRepository.findDueScheduledJobs(any(LocalDateTime.class))).thenReturn(Collections.emptyList());

        jobScheduler.scheduleScrapingJobs();

        verify(jobRepository, times(1)).findDueScheduledJobs(any(LocalDateTime.class));
        verify(jobRepository, never()).save(any(ScrapingJob.class));
        verify(orchestrationService, never()).executeScrapingJob(any(ScrapingJob.class));
    }

    @Test
    void testScheduleScrapingJobs_SchedulerDisabled() {
        ReflectionTestUtils.setField(jobScheduler, "schedulerEnabled", false);

        jobScheduler.scheduleScrapingJobs();

        verify(jobRepository, never()).findDueScheduledJobs(any(LocalDateTime.class));
        verify(jobRepository, never()).save(any(ScrapingJob.class));
        verify(orchestrationService, never()).executeScrapingJob(any(ScrapingJob.class));
    }

    @Test
    void testUpdateJobNextRunTime_ScheduledJob() {
        LocalDateTime initialNextRun = scheduledJob.getNextRunAt(); // Should be in the past
        jobScheduler.updateJobNextRunTime(scheduledJob);

        assertThat(scheduledJob.getNextRunAt()).isAfter(initialNextRun); // Should have updated to a future time
        assertThat(scheduledJob.getStatus()).isEqualTo(JobStatus.SCHEDULED);
    }

    @Test
    void testUpdateJobNextRunTime_ManualJob() {
        jobScheduler.updateJobNextRunTime(manualJob);

        assertThat(manualJob.getNextRunAt()).isNull();
        assertThat(manualJob.getStatus()).isEqualTo(JobStatus.CREATED); // Status should remain as it was
    }

    @Test
    void testUpdateJobNextRunTime_InvalidCron() {
        scheduledJob.setScheduleCron("INVALID CRON EXPRESSION");
        jobScheduler.updateJobNextRunTime(scheduledJob);

        assertThat(scheduledJob.getNextRunAt()).isNull();
        assertThat(scheduledJob.getStatus()).isEqualTo(JobStatus.FAILED);
    }
}
```