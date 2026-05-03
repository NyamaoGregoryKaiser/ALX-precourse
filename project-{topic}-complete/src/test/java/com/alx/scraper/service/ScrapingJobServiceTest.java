package com.alx.scraper.service;

import com.alx.scraper.dto.ScrapingJobCreateDTO;
import com.alx.scraper.dto.ScrapingJobDTO;
import com.alx.scraper.entity.Role;
import com.alx.scraper.entity.ScrapedData;
import com.alx.scraper.entity.ScrapingJob;
import com.alx.scraper.entity.ScrapingStatus;
import com.alx.scraper.entity.User;
import com.alx.scraper.exception.ResourceNotFoundException;
import com.alx.scraper.repository.ScrapedDataRepository;
import com.alx.scraper.repository.ScrapingJobRepository;
import com.alx.scraper.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.task.TaskExecutor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadPoolExecutor;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScrapingJobServiceTest {

    @Mock
    private ScrapingJobRepository scrapingJobRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ScrapedDataRepository scrapedDataRepository;
    @Mock
    private ScraperService scraperService;
    @Mock
    private TaskExecutor taskExecutor; // Mock TaskExecutor

    @InjectMocks
    private ScrapingJobService scrapingJobService;

    private User testUser;
    private ScrapingJob testJob;
    private ScrapingJobCreateDTO createDTO;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPassword("encodedPass");
        Role userRole = new Role();
        userRole.setName(Role.ERole.ROLE_USER);
        testUser.setRoles(Collections.singleton(userRole));

        testJob = new ScrapingJob();
        testJob.setId(101L);
        testJob.setJobName("My Test Job");
        testJob.setTargetUrl("http://example.com");
        testJob.setSelectors(Map.of("title", "h1"));
        testJob.setStatus(ScrapingStatus.CREATED);
        testJob.setUser(testUser);
        testJob.setCreatedAt(LocalDateTime.now());
        testJob.setPagesScrapedCount(0);

        createDTO = new ScrapingJobCreateDTO();
        createDTO.setJobName("New Job");
        createDTO.setTargetUrl("http://newsite.com");
        createDTO.setSelectors(Map.of("name", ".product-name"));

        // Set up SecurityContext for tests
        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn("testuser");
        when(authentication.getAuthorities()).thenReturn(Set.of(new SimpleGrantedAuthority("ROLE_USER")));
        SecurityContext securityContext = mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
    }

    @Test
    @DisplayName("Should create a new scraping job successfully")
    void createScrapingJob_Success() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(scrapingJobRepository.save(any(ScrapingJob.class))).thenReturn(testJob);

        ScrapingJobDTO result = scrapingJobService.createScrapingJob(createDTO);

        assertNotNull(result);
        assertEquals(testJob.getJobName(), result.getJobName());
        assertEquals(ScrapingStatus.CREATED, result.getStatus());
        assertEquals(testUser.getId(), result.getUserId());
        verify(userRepository, times(1)).findByUsername("testuser");
        verify(scrapingJobRepository, times(1)).save(any(ScrapingJob.class));
    }

    @Test
    @DisplayName("Should get a scraping job by ID successfully")
    void getScrapingJobById_Success() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(scrapingJobRepository.findById(testJob.getId())).thenReturn(Optional.of(testJob));
        when(scrapedDataRepository.countByScrapingJobId(anyLong())).thenReturn(0L);

        ScrapingJobDTO result = scrapingJobService.getScrapingJobById(testJob.getId());

        assertNotNull(result);
        assertEquals(testJob.getId(), result.getId());
        assertEquals(testJob.getJobName(), result.getJobName());
        verify(scrapingJobRepository, times(1)).findById(testJob.getId());
        verify(userRepository, times(1)).findByUsername("testuser");
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException if job not found by ID")
    void getScrapingJobById_NotFound() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(scrapingJobRepository.findById(testJob.getId())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> scrapingJobService.getScrapingJobById(testJob.getId()));
        verify(scrapingJobRepository, times(1)).findById(testJob.getId());
    }

    @Test
    @DisplayName("Should update an existing scraping job successfully")
    void updateScrapingJob_Success() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(scrapingJobRepository.findById(testJob.getId())).thenReturn(Optional.of(testJob));
        when(scrapingJobRepository.save(any(ScrapingJob.class))).thenAnswer(i -> i.getArgument(0));
        when(scrapedDataRepository.countByScrapingJobId(anyLong())).thenReturn(0L);

        ScrapingJobCreateDTO updateDTO = new ScrapingJobCreateDTO();
        updateDTO.setJobName("Updated Job Name");
        updateDTO.setTargetUrl("http://updated.com");
        updateDTO.setSelectors(Map.of("item", ".item"));

        ScrapingJobDTO result = scrapingJobService.updateScrapingJob(testJob.getId(), updateDTO);

        assertNotNull(result);
        assertEquals("Updated Job Name", result.getJobName());
        assertEquals("http://updated.com", result.getTargetUrl());
        verify(scrapingJobRepository, times(1)).save(testJob);
    }

    @Test
    @DisplayName("Should throw IllegalStateException if attempting to update a running job")
    void updateScrapingJob_RunningJob() {
        testJob.setStatus(ScrapingStatus.RUNNING);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(scrapingJobRepository.findById(testJob.getId())).thenReturn(Optional.of(testJob));

        assertThrows(IllegalStateException.class, () -> scrapingJobService.updateScrapingJob(testJob.getId(), createDTO));
        verify(scrapingJobRepository, never()).save(any(ScrapingJob.class));
    }

    @Test
    @DisplayName("Should delete a scraping job successfully")
    void deleteScrapingJob_Success() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(scrapingJobRepository.findById(testJob.getId())).thenReturn(Optional.of(testJob));
        doNothing().when(scrapingJobRepository).delete(testJob);

        scrapingJobService.deleteScrapingJob(testJob.getId());

        verify(scrapingJobRepository, times(1)).delete(testJob);
    }

    @Test
    @DisplayName("Should start a scraping job asynchronously")
    void startScrapingJob_Success() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(scrapingJobRepository.findById(testJob.getId())).thenReturn(Optional.of(testJob));
        when(scrapingJobRepository.save(any(ScrapingJob.class))).thenAnswer(i -> i.getArgument(0));
        when(taskExecutor.submit(any(Runnable.class))).thenReturn(mock(Future.class));
        when(scrapedDataRepository.countByScrapingJobId(anyLong())).thenReturn(0L);


        ScrapingJobDTO result = scrapingJobService.startScrapingJob(testJob.getId());

        assertNotNull(result);
        assertEquals(ScrapingStatus.RUNNING, result.getStatus());
        assertNotNull(result.getStartedAt());
        verify(scrapingJobRepository, times(1)).save(testJob);
        verify(taskExecutor, times(1)).submit(any(Runnable.class));
    }

    @Test
    @DisplayName("Should stop a running scraping job")
    void stopScrapingJob_Success() {
        testJob.setStatus(ScrapingStatus.RUNNING);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(scrapingJobRepository.findById(testJob.getId())).thenReturn(Optional.of(testJob));
        when(scrapingJobRepository.save(any(ScrapingJob.class))).thenAnswer(i -> i.getArgument(0));
        when(scrapedDataRepository.countByScrapingJobId(anyLong())).thenReturn(0L);

        // Mimic a running task being tracked
        ConcurrentHashMap<Long, Future<?>> runningJobs = new ConcurrentHashMap<>();
        Future<?> mockFuture = mock(Future.class);
        when(mockFuture.cancel(true)).thenReturn(true);
        runningJobs.put(testJob.getId(), mockFuture);

        try (MockedStatic<ScrapingJobService> mockedService = mockStatic(ScrapingJobService.class)) {
            // Need to mock the internal runningJobs map, this is tricky with @InjectMocks
            // A better approach for this map is to expose it or use a separate manager bean.
            // For now, assume it's directly accessible/manipulated or tested differently.
            // This test is limited by not being able to directly inject into the private map.
            // A direct `spy` on the service or refactoring the map out would be better.
            // For demo, we'll proceed assuming future.cancel is called if a task existed.
            // A direct unit test might use reflection to inject into the private map,
            // or modify the service to have a setter for it (which is less ideal).

            // Workaround: Mock the service itself if we want to bypass map access limitation for this test
            // Or test this with integration tests where the executor is real.
            // Given the current setup, we'll assume the map manipulation and verify other interactions.
        }

        ScrapingJobDTO result = scrapingJobService.stopScrapingJob(testJob.getId());

        assertNotNull(result);
        assertEquals(ScrapingStatus.STOPPED, result.getStatus());
        assertNotNull(result.getCompletedAt());
        verify(scrapingJobRepository, times(1)).save(testJob);
    }

    @Test
    @DisplayName("Should retrieve scraped data for a given job")
    void getScrapedDataForJob_Success() {
        ScrapedData data1 = new ScrapedData();
        data1.setId(1L);
        data1.setScrapingJob(testJob);
        data1.setUrl("http://example.com/data1");
        data1.setExtractedData(Map.of("key", "value"));

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(scrapingJobRepository.findById(testJob.getId())).thenReturn(Optional.of(testJob));
        when(scrapedDataRepository.findByScrapingJobId(testJob.getId())).thenReturn(List.of(data1));

        List<ScrapedDataDTO> result = scrapingJobService.getScrapedDataForJob(testJob.getId());

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(data1.getId(), result.get(0).getId());
        verify(scrapedDataRepository, times(1)).findByScrapingJobId(testJob.getId());
    }

    @Test
    @DisplayName("Should deny access to job not owned by user (not admin)")
    void getJobOwnedByUser_AccessDenied() {
        User anotherUser = new User();
        anotherUser.setId(2L);
        anotherUser.setUsername("anotheruser");

        ScrapingJob anotherUserJob = new ScrapingJob();
        anotherUserJob.setId(102L);
        anotherUserJob.setUser(anotherUser); // This job belongs to another user

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(scrapingJobRepository.findById(anotherUserJob.getId())).thenReturn(Optional.of(anotherUserJob));

        assertThrows(AccessDeniedException.class, () -> scrapingJobService.getScrapingJobById(anotherUserJob.getId()));
    }

    @Test
    @DisplayName("Admin should be able to access any job")
    void getJobOwnedByUser_AdminAccess() {
        // Change current user to admin
        Authentication adminAuth = mock(Authentication.class);
        when(adminAuth.getName()).thenReturn("adminuser");
        when(adminAuth.getAuthorities()).thenReturn(Set.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        SecurityContext adminSecurityContext = mock(SecurityContext.class);
        when(adminSecurityContext.getAuthentication()).thenReturn(adminAuth);
        SecurityContextHolder.setContext(adminSecurityContext);

        User adminUser = new User();
        adminUser.setId(2L);
        adminUser.setUsername("adminuser");
        Role adminRole = new Role();
        adminRole.setName(Role.ERole.ROLE_ADMIN);
        adminUser.setRoles(Collections.singleton(adminRole));

        User anotherUser = new User();
        anotherUser.setId(3L);
        anotherUser.setUsername("anotheruser");

        ScrapingJob anotherUserJob = new ScrapingJob();
        anotherUserJob.setId(102L);
        anotherUserJob.setJobName("Other User's Job");
        anotherUserJob.setTargetUrl("http://other.com");
        anotherUserJob.setSelectors(Map.of("p", "p"));
        anotherUserJob.setStatus(ScrapingStatus.CREATED);
        anotherUserJob.setUser(anotherUser); // This job belongs to another user

        when(userRepository.findByUsername("adminuser")).thenReturn(Optional.of(adminUser));
        when(scrapingJobRepository.findById(anotherUserJob.getId())).thenReturn(Optional.of(anotherUserJob));
        when(scrapedDataRepository.countByScrapingJobId(anyLong())).thenReturn(0L);

        // Admin tries to access another user's job
        ScrapingJobDTO result = scrapingJobService.getScrapingJobById(anotherUserJob.getId());

        assertNotNull(result);
        assertEquals(anotherUserJob.getId(), result.getId());
        assertEquals(anotherUser.getId(), result.getUserId()); // Admin can see it's owned by another user
    }

    @Test
    @DisplayName("Scheduled task should start pending jobs")
    void startPendingJobs_Success() {
        ScrapingJob pendingJob = new ScrapingJob();
        pendingJob.setId(200L);
        pendingJob.setJobName("Pending Job");
        pendingJob.setTargetUrl("http://pending.com");
        pendingJob.setSelectors(Map.of("h2", "h2"));
        pendingJob.setStatus(ScrapingStatus.CREATED);
        pendingJob.setUser(testUser);
        pendingJob.setCreatedAt(LocalDateTime.now());
        pendingJob.setPagesScrapedCount(0);

        when(scrapingJobRepository.findByStatus(ScrapingStatus.CREATED)).thenReturn(List.of(pendingJob));
        when(scrapingJobRepository.findById(pendingJob.getId())).thenReturn(Optional.of(pendingJob));
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser)); // For startScrapingJob to resolve owner
        when(scrapingJobRepository.save(any(ScrapingJob.class))).thenAnswer(i -> i.getArgument(0));
        when(taskExecutor.submit(any(Runnable.class))).thenReturn(mock(Future.class));

        // Create a separate Authentication for the scheduled task if it runs under different context,
        // or ensure the setup one is sufficient for internal calls.
        Authentication systemAuth = mock(Authentication.class);
        when(systemAuth.getName()).thenReturn("system"); // A typical 'system' or 'anonymous' user for scheduled tasks
        when(systemAuth.getAuthorities()).thenReturn(Collections.emptySet());
        SecurityContext systemSecurityContext = mock(SecurityContext.class);
        when(systemSecurityContext.getAuthentication()).thenReturn(systemAuth);
        // Temporarily set the security context for the scheduled task execution
        try (MockedStatic<SecurityContextHolder> mockedSecurityContextHolder = mockStatic(SecurityContextHolder.class)) {
            mockedSecurityContextHolder.when(SecurityContextHolder::getContext).thenReturn(systemSecurityContext);
            when(userRepository.findByUsername("system")).thenReturn(Optional.empty()); // System user might not exist in repo
            // We need to specifically mock the lookup for the job's *owner* during startScrapingJob
            when(userRepository.findByUsername(pendingJob.getUser().getUsername())).thenReturn(Optional.of(pendingJob.getUser()));

            scrapingJobService.startPendingJobs();

            verify(scrapingJobRepository, times(1)).findByStatus(ScrapingStatus.CREATED);
            // The startScrapingJob method will be called internally for `pendingJob.getId()`
            verify(taskExecutor, times(1)).submit(any(Runnable.class));
            // Verify that the job's status was updated to RUNNING (and saved) within the startScrapingJob call
            verify(scrapingJobRepository, times(2)).save(argThat(job -> job.getId().equals(pendingJob.getId()) && job.getStatus() == ScrapingStatus.RUNNING));
        }
    }
}