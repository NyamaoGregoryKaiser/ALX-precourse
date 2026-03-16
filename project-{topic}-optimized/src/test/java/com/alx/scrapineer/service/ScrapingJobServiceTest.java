```java
package com.alx.scrapineer.service;

import com.alx.scrapineer.api.dto.scraping.ScrapingJobDto;
import com.alx.scrapineer.api.dto.scraping.ScrapingTargetMapping;
import com.alx.scrapineer.common.exception.BadRequestException;
import com.alx.scrapineer.common.exception.ResourceNotFoundException;
import com.alx.scrapineer.data.entity.JobStatus;
import com.alx.scrapineer.data.entity.Role;
import com.alx.scrapineer.data.entity.ScrapingJob;
import com.alx.scrapineer.data.entity.ScrapingTarget;
import com.alx.scrapineer.data.entity.User;
import com.alx.scrapineer.data.repository.ScrapingJobRepository;
import com.alx.scrapineer.data.repository.ScrapingTargetRepository;
import com.alx.scrapineer.scheduler.ScrapingJobScheduler;
import com.alx.scrapineer.scraper.service.ScrapingOrchestrationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScrapingJobServiceTest {

    @Mock
    private ScrapingJobRepository jobRepository;
    @Mock
    private ScrapingTargetRepository targetRepository;
    @Mock
    private ScrapingOrchestrationService orchestrationService;
    @Mock
    private ScrapingJobScheduler jobScheduler;

    @InjectMocks
    private ScrapingJobService jobService;

    private User testUser;
    private ScrapingTarget testTarget;
    private ScrapingJob testJob;
    private ScrapingJobDto testJobDto;

    @BeforeEach
    void setUp() {
        // Manually inject the mapper
        ScrapingTargetMapping mapper = new ScrapingTargetMapping();
        ReflectionTestUtils.setField(jobService, "targetMapping", mapper);

        testUser = User.builder().id(1L).username("testuser").password("pass").roles(Set.of(Role.USER)).build();
        testTarget = ScrapingTarget.builder().id(10L).user(testUser).name("Test Target").url("http://example.com").active(true).build();

        testJob = ScrapingJob.builder()
                .id(1L)
                .user(testUser)
                .target(testTarget)
                .status(JobStatus.CREATED)
                .scheduleCron(null)
                .build();

        testJobDto = ScrapingJobDto.builder()
                .id(1L)
                .userId(testUser.getId())
                .targetId(testTarget.getId())
                .targetName(testTarget.getName())
                .status(JobStatus.CREATED)
                .scheduleCron(null)
                .build();
    }

    @Test
    void testGetAllJobs_Success() {
        when(jobRepository.findByUser(testUser)).thenReturn(List.of(testJob));

        List<ScrapingJobDto> result = jobService.getAllJobs(testUser);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(testJobDto.getId());
        verify(jobRepository, times(1)).findByUser(testUser);
    }

    @Test
    void testGetJobById_Success() {
        when(jobRepository.findByIdAndUser(1L, testUser)).thenReturn(Optional.of(testJob));

        ScrapingJobDto result = jobService.getJobById(1L, testUser);

        assertThat(result).isEqualTo(testJobDto);
        verify(jobRepository, times(1)).findByIdAndUser(1L, testUser);
    }

    @Test
    void testGetJobById_NotFound() {
        when(jobRepository.findByIdAndUser(2L, testUser)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> jobService.getJobById(2L, testUser));
        verify(jobRepository, times(1)).findByIdAndUser(2L, testUser);
    }

    @Test
    void testCreateJob_Manual_Success() {
        ScrapingJobDto newJobDto = ScrapingJobDto.builder()
                .targetId(testTarget.getId())
                .scheduleCron(null)
                .status(JobStatus.CREATED)
                .build();

        when(targetRepository.findByIdAndUser(testTarget.getId(), testUser)).thenReturn(Optional.of(testTarget));
        when(jobRepository.save(any(ScrapingJob.class))).thenAnswer(invocation -> {
            ScrapingJob savedJob = invocation.getArgument(0);
            savedJob.setId(2L);
            return savedJob;
        });

        ScrapingJobDto createdJob = jobService.createJob(newJobDto, testUser);

        assertThat(createdJob).isNotNull();
        assertThat(createdJob.getId()).isEqualTo(2L);
        assertThat(createdJob.getStatus()).isEqualTo(JobStatus.CREATED);
        assertThat(createdJob.getScheduleCron()).isNull();
        verify(jobRepository, times(1)).save(any(ScrapingJob.class));
        verify(jobScheduler, never()).updateJobNextRunTime(any(ScrapingJob.class));
    }

    @Test
    void testCreateJob_Scheduled_Success() {
        ScrapingJobDto newJobDto = ScrapingJobDto.builder()
                .targetId(testTarget.getId())
                .scheduleCron("0 0 * * * *")
                .status(JobStatus.SCHEDULED) // Initial status can be set or derived
                .build();

        when(targetRepository.findByIdAndUser(testTarget.getId(), testUser)).thenReturn(Optional.of(testTarget));
        when(jobRepository.save(any(ScrapingJob.class))).thenAnswer(invocation -> {
            ScrapingJob savedJob = invocation.getArgument(0);
            savedJob.setId(2L);
            savedJob.setNextRunAt(LocalDateTime.now().plusHours(1)); // Simulate scheduler update
            return savedJob;
        });
        doAnswer(invocation -> {
            ScrapingJob job = invocation.getArgument(0);
            job.setStatus(JobStatus.SCHEDULED); // Scheduler sets status
            job.setNextRunAt(LocalDateTime.now().plusHours(1)); // Simulate next run calculation
            return null;
        }).when(jobScheduler).updateJobNextRunTime(any(ScrapingJob.class));


        ScrapingJobDto createdJob = jobService.createJob(newJobDto, testUser);

        assertThat(createdJob).isNotNull();
        assertThat(createdJob.getId()).isEqualTo(2L);
        assertThat(createdJob.getStatus()).isEqualTo(JobStatus.SCHEDULED);
        assertThat(createdJob.getScheduleCron()).isEqualTo("0 0 * * * *");
        assertThat(createdJob.getNextRunAt()).isNotNull();
        verify(jobRepository, times(1)).save(any(ScrapingJob.class));
        verify(jobScheduler, times(1)).updateJobNextRunTime(any(ScrapingJob.class));
    }

    @Test
    void testCreateJob_TargetNotFound() {
        ScrapingJobDto newJobDto = ScrapingJobDto.builder()
                .targetId(99L)
                .scheduleCron(null)
                .build();

        when(targetRepository.findByIdAndUser(99L, testUser)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> jobService.createJob(newJobDto, testUser));
        verify(jobRepository, never()).save(any(ScrapingJob.class));
    }

    @Test
    void testUpdateJob_ChangeSchedule() {
        testJob.setStatus(JobStatus.SCHEDULED);
        testJob.setScheduleCron("0 0 0 * * ?");
        testJob.setNextRunAt(LocalDateTime.now().plusDays(1));

        ScrapingJobDto updatedJobDto = ScrapingJobDto.builder()
                .id(1L)
                .targetId(testTarget.getId())
                .scheduleCron("0 30 * * * *") // Change to run every hour at minute 30
                .status(JobStatus.SCHEDULED)
                .build();

        when(jobRepository.findByIdAndUser(1L, testUser)).thenReturn(Optional.of(testJob));
        when(jobRepository.save(any(ScrapingJob.class))).thenAnswer(invocation -> invocation.getArgument(0)); // Return the modified job
        doAnswer(invocation -> {
            ScrapingJob job = invocation.getArgument(0);
            job.setNextRunAt(LocalDateTime.now().plusMinutes(30)); // Simulate new next run time
            return null;
        }).when(jobScheduler).updateJobNextRunTime(any(ScrapingJob.class));

        ScrapingJobDto result = jobService.updateJob(1L, updatedJobDto, testUser);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getScheduleCron()).isEqualTo("0 30 * * * *");
        assertThat(result.getStatus()).isEqualTo(JobStatus.SCHEDULED);
        assertThat(result.getNextRunAt()).isNotNull(); // Should be updated
        verify(jobRepository, times(1)).save(any(ScrapingJob.class));
        verify(jobScheduler, times(1)).updateJobNextRunTime(any(ScrapingJob.class));
    }

    @Test
    void testUpdateJob_RemoveSchedule() {
        testJob.setStatus(JobStatus.SCHEDULED);
        testJob.setScheduleCron("0 0 0 * * ?");
        testJob.setNextRunAt(LocalDateTime.now().plusDays(1));

        ScrapingJobDto updatedJobDto = ScrapingJobDto.builder()
                .id(1L)
                .targetId(testTarget.getId())
                .scheduleCron("") // Remove schedule
                .status(JobStatus.CREATED)
                .build();

        when(jobRepository.findByIdAndUser(1L, testUser)).thenReturn(Optional.of(testJob));
        when(jobRepository.save(any(ScrapingJob.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ScrapingJobDto result = jobService.updateJob(1L, updatedJobDto, testUser);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getScheduleCron()).isEmpty();
        assertThat(result.getStatus()).isEqualTo(JobStatus.CREATED);
        assertThat(result.getNextRunAt()).isNull();
        verify(jobRepository, times(1)).save(any(ScrapingJob.class));
        verify(jobScheduler, never()).updateJobNextRunTime(any(ScrapingJob.class));
    }

    @Test
    void testStartJob_Success() {
        when(jobRepository.findByIdAndUser(1L, testUser)).thenReturn(Optional.of(testJob));
        doNothing().when(orchestrationService).executeScrapingJob(testJob);

        ScrapingJobDto result = jobService.startJob(1L, testUser);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        // Status might be RUNNING immediately after call to orchestrationService or CREATED depending on async execution
        // We only verify the call, actual status change is handled by orchestrationService
        verify(orchestrationService, times(1)).executeScrapingJob(testJob);
    }

    @Test
    void testStartJob_TargetInactive() {
        testTarget.setActive(false);
        when(jobRepository.findByIdAndUser(1L, testUser)).thenReturn(Optional.of(testJob));

        assertThrows(BadRequestException.class, () -> jobService.startJob(1L, testUser));
        verify(orchestrationService, never()).executeScrapingJob(any(ScrapingJob.class));
    }

    @Test
    void testStartJob_AlreadyRunning() {
        testJob.setStatus(JobStatus.RUNNING);
        when(jobRepository.findByIdAndUser(1L, testUser)).thenReturn(Optional.of(testJob));

        assertThrows(BadRequestException.class, () -> jobService.startJob(1L, testUser));
        verify(orchestrationService, never()).executeScrapingJob(any(ScrapingJob.class));
    }

    @Test
    void testStopJob_Success() {
        testJob.setStatus(JobStatus.RUNNING);
        when(jobRepository.findByIdAndUser(1L, testUser)).thenReturn(Optional.of(testJob));
        when(jobRepository.save(any(ScrapingJob.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ScrapingJobDto result = jobService.stopJob(1L, testUser);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getStatus()).isEqualTo(JobStatus.STOPPED);
        assertThat(result.getNextRunAt()).isNull(); // Should clear next run
        verify(jobRepository, times(1)).save(any(ScrapingJob.class));
    }

    @Test
    void testStopJob_AlreadyTerminalState() {
        testJob.setStatus(JobStatus.COMPLETED);
        when(jobRepository.findByIdAndUser(1L, testUser)).thenReturn(Optional.of(testJob));

        assertThrows(BadRequestException.class, () -> jobService.stopJob(1L, testUser));
        verify(jobRepository, never()).save(any(ScrapingJob.class));
    }
}
```