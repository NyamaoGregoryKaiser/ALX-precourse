```java
package com.alx.scrapineer.scraper.service;

import com.alx.scrapineer.data.entity.CssSelector;
import com.alx.scrapineer.data.entity.JobStatus;
import com.alx.scrapineer.data.entity.Role;
import com.alx.scrapineer.data.entity.ScrapingJob;
import com.alx.scrapineer.data.entity.ScrapingTarget;
import com.alx.scrapineer.data.entity.SelectorType;
import com.alx.scrapineer.data.entity.User;
import com.alx.scrapineer.data.repository.ScrapingJobRepository;
import com.alx.scrapineer.data.repository.ScrapingResultRepository;
import com.alx.scrapineer.scraper.engine.ScraperException;
import com.alx.scrapineer.scraper.strategy.JsoupScraperEngine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScrapingOrchestrationServiceTest {

    @Mock
    private ScrapingJobRepository jobRepository;
    @Mock
    private ScrapingResultRepository resultRepository;
    @Mock
    private JsoupScraperEngine jsoupScraperEngine;

    @InjectMocks
    private ScrapingOrchestrationService orchestrationService;

    private User testUser;
    private ScrapingTarget testTarget;
    private ScrapingJob testJob;
    private CssSelector testSelector;

    @BeforeEach
    void setUp() {
        testUser = User.builder().id(1L).username("testuser").password("pass").roles(Set.of(Role.USER)).build();

        testSelector = CssSelector.builder()
                .id(101L)
                .name("title")
                .selectorValue("h1")
                .type(SelectorType.TEXT)
                .build();

        testTarget = ScrapingTarget.builder()
                .id(10L)
                .user(testUser)
                .name("Test Target")
                .url("http://example.com")
                .active(true)
                .selectors(List.of(testSelector))
                .build();
        testSelector.setTarget(testTarget); // Important for bidirectional relationship simulation

        testJob = ScrapingJob.builder()
                .id(1L)
                .user(testUser)
                .target(testTarget)
                .status(JobStatus.CREATED)
                .build();
    }

    @Test
    void testExecuteScrapingJob_Success() {
        Map<String, String> expectedData = Map.of("title", "Example Title");
        when(jsoupScraperEngine.scrape(testTarget)).thenReturn(expectedData);
        when(jobRepository.save(any(ScrapingJob.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(resultRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        orchestrationService.executeScrapingJob(testJob);

        assertThat(testJob.getStatus()).isEqualTo(JobStatus.COMPLETED);
        assertThat(testJob.getLastRunAt()).isNotNull();

        verify(jobRepository, times(2)).save(any(ScrapingJob.class)); // Initial save (RUNNING) and final save (COMPLETED)
        verify(resultRepository, times(1)).save(argThat(result ->
                result.getJob().equals(testJob) &&
                result.getTarget().equals(testTarget) &&
                result.isSuccessful() &&
                result.getExtractedData().equals(expectedData) &&
                result.getErrorMessage() == null
        ));
        verify(jsoupScraperEngine, times(1)).scrape(testTarget);
    }

    @Test
    void testExecuteScrapingJob_ScraperException() {
        String errorMessage = "Failed to connect";
        when(jsoupScraperEngine.scrape(testTarget)).thenThrow(new ScraperException(errorMessage));
        when(jobRepository.save(any(ScrapingJob.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(resultRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        orchestrationService.executeScrapingJob(testJob);

        assertThat(testJob.getStatus()).isEqualTo(JobStatus.FAILED);
        assertThat(testJob.getLastRunAt()).isNotNull();

        verify(jobRepository, times(2)).save(any(ScrapingJob.class)); // Initial save (RUNNING) and final save (FAILED)
        verify(resultRepository, times(1)).save(argThat(result ->
                result.getJob().equals(testJob) &&
                result.getTarget().equals(testTarget) &&
                !result.isSuccessful() &&
                result.getExtractedData() == null &&
                result.getErrorMessage().contains(errorMessage)
        ));
        verify(jsoupScraperEngine, times(1)).scrape(testTarget);
    }

    @Test
    void testExecuteScrapingJob_GenericException() {
        String errorMessage = "Unexpected runtime error";
        when(jsoupScraperEngine.scrape(testTarget)).thenThrow(new RuntimeException(errorMessage));
        when(jobRepository.save(any(ScrapingJob.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(resultRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        orchestrationService.executeScrapingJob(testJob);

        assertThat(testJob.getStatus()).isEqualTo(JobStatus.FAILED);
        assertThat(testJob.getLastRunAt()).isNotNull();

        verify(jobRepository, times(2)).save(any(ScrapingJob.class)); // Initial save (RUNNING) and final save (FAILED)
        verify(resultRepository, times(1)).save(argThat(result ->
                result.getJob().equals(testJob) &&
                result.getTarget().equals(testTarget) &&
                !result.isSuccessful() &&
                result.getExtractedData() == null &&
                result.getErrorMessage().contains("Unexpected error")
        ));
        verify(jsoupScraperEngine, times(1)).scrape(testTarget);
    }
}
```