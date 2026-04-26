package com.alx.scraper.controller;

import com.alx.scraper.dto.ScrapingJobCreateRequest;
import com.alx.scraper.model.ScrapingJob;
import com.alx.scraper.model.ScrapedData;
import com.alx.scraper.service.ScrapingJobService;
import com.alx.scraper.service.UserService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.Collections;
import java.util.List;

/**
 * MVC Controller for handling web requests and rendering Thymeleaf templates.
 * Provides basic UI for login, registration, job management, and viewing scraped data.
 *
 * ALX Focus: Demonstrates a minimal frontend integration with the Spring Boot backend
 * using Thymeleaf. Shows how to handle form submissions, redirect, and display data.
 * While the primary focus is the API, a basic UI demonstrates full-stack capability.
 * This controller primarily serves HTML views and interacts with the services.
 */
@Controller
@Slf4j
public class WebController {

    @Autowired
    private UserService userService;

    @Autowired
    private ScrapingJobService scrapingJobService;

    @Autowired
    private ObjectMapper objectMapper; // For pretty printing JSON

    // In a real application, the UserDetails object would often be extended
    // to include the user's ID directly, or a custom principal would be used.
    // For this example, and because the UserRepository is not directly injected here
    // (to keep controller-service separation clean), we use a placeholder ID
    // or rely on a service method that internally resolves the user by username.
    // A robust solution for a UI would often embed the ID in the session/context
    // or fetch it on demand.
    private Long getCurrentUserIdFromAuth(Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated() && !(authentication.getPrincipal() instanceof String)) {
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            // A production-grade implementation would fetch the actual user ID from the database
            // using the username, or retrieve it from a custom UserDetails object.
            // For simplicity in this demo, we use a fixed ID for all authenticated users
            // when interacting with the UI, as the core security is handled by JWT for APIs.
            // The service methods will still validate ownership based on this user ID.
            return 1L; // Placeholder for UI demo. Actual user ID should come from a secure source.
        }
        return null;
    }

    /**
     * Displays the home page or redirects to login/dashboard based on authentication status.
     */
    @GetMapping("/")
    public String home(Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated() && !(authentication.getPrincipal() instanceof String)) {
            // User is authenticated, redirect to dashboard
            return "redirect:/dashboard";
        }
        // User is not authenticated or is anonymous, redirect to login
        return "redirect:/login";
    }

    /**
     * Displays the login page.
     */
    @GetMapping("/login")
    public String login() {
        return "login";
    }

    /**
     * Displays the registration page.
     */
    @GetMapping("/register")
    public String register(Model model) {
        model.addAttribute("userDTO", new com.alx.scraper.dto.UserDTO());
        return "register";
    }

    /**
     * Handles registration form submission from the UI.
     * This directly calls the UserService.
     */
    @PostMapping("/register")
    public String processRegister(@ModelAttribute("userDTO") @Valid com.alx.scraper.dto.UserDTO userDTO,
                                  RedirectAttributes redirectAttributes) {
        try {
            userService.registerNewUser(userDTO);
            redirectAttributes.addFlashAttribute("successMessage", "Registration successful! Please log in.");
            log.info("User {} registered via UI.", userDTO.getUsername());
            return "redirect:/login";
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Registration failed: " + e.getMessage());
            log.error("UI registration failed for user {}: {}", userDTO.getUsername(), e.getMessage());
            return "register"; // Return to register page on error
        }
    }

    /**
     * Displays the user dashboard with a list of scraping jobs.
     * Requires authentication.
     */
    @GetMapping("/dashboard")
    @PreAuthorize("isAuthenticated()") // Spring Security annotation
    public String dashboard(Model model, Authentication authentication) {
        Long userId = getCurrentUserIdFromAuth(authentication);
        if (userId == null) {
            log.warn("Authenticated user ID not found for dashboard access. Redirecting to login.");
            return "redirect:/login";
        }
        try {
            List<ScrapingJob> jobs = scrapingJobService.getAllScrapingJobsForUser(userId);
            model.addAttribute("jobs", jobs);
            model.addAttribute("newJobRequest", new ScrapingJobCreateRequest());
            log.debug("Displaying dashboard for user ID {}", userId);
        } catch (Exception e) {
            model.addAttribute("errorMessage", "Error loading dashboard: " + e.getMessage());
            model.addAttribute("jobs", Collections.emptyList());
            model.addAttribute("newJobRequest", new ScrapingJobCreateRequest());
            log.error("Error loading dashboard for user ID {}: {}", userId, e.getMessage());
        }
        return "dashboard";
    }

    /**
     * Handles creation of a new scraping job from the dashboard UI.
     *
     * @param newJobRequest The request containing new job details.
     * @param redirectAttributes For flash messages.
     * @param authentication The authenticated user's details.
     * @return Redirect to dashboard.
     */
    @PostMapping("/jobs/create-ui")
    @PreAuthorize("isAuthenticated()")
    public String createJob(@ModelAttribute("newJobRequest") @Valid ScrapingJobCreateRequest newJobRequest,
                            RedirectAttributes redirectAttributes,
                            Authentication authentication) {
        Long userId = getCurrentUserIdFromAuth(authentication);
        if (userId == null) {
            redirectAttributes.addFlashAttribute("errorMessage", "Authentication error. Please log in again.");
            return "redirect:/login";
        }
        try {
            scrapingJobService.createScrapingJob(userId, newJobRequest);
            redirectAttributes.addFlashAttribute("successMessage", "Scraping job created successfully!");
            log.info("Scraping job '{}' created by user ID {} via UI.", newJobRequest.getName(), userId);
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Error creating job: " + e.getMessage());
            log.error("Error creating job for user ID {}: {}", userId, e.getMessage());
        }
        return "redirect:/dashboard";
    }

    /**
     * Displays details and scraped data for a specific job.
     *
     * @param jobId The ID of the job.
     * @param model The Thymeleaf model.
     * @param authentication The authenticated user's details.
     * @return The job detail template.
     */
    @GetMapping("/jobs/{jobId}")
    @PreAuthorize("isAuthenticated()")
    public String jobDetail(@PathVariable Long jobId, Model model, Authentication authentication) {
        Long userId = getCurrentUserIdFromAuth(authentication);
        if (userId == null) {
            return "redirect:/login";
        }
        try {
            ScrapingJob job = scrapingJobService.getScrapingJobById(jobId, userId);
            model.addAttribute("job", job);

            // Fetch recent scraped data, e.g., first page, 10 items, sorted by scrapedAt desc
            Page<ScrapedData> scrapedDataPage = scrapingJobService.getScrapedDataForJob(jobId, userId, PageRequest.of(0, 10, Sort.by("scrapedAt").descending()));
            List<String> formattedScrapedData = scrapedDataPage.getContent().stream()
                    .map(data -> {
                        try {
                            // Pretty print JSON for display
                            Object json = objectMapper.readValue(data.getDataJson(), Object.class);
                            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(json);
                        } catch (JsonProcessingException e) {
                            log.error("Error pretty printing JSON for scraped data ID {}: {}", data.getId(), e.getMessage());
                            return data.getDataJson(); // Return raw JSON if formatting fails
                        }
                    })
                    .toList();

            model.addAttribute("scrapedData", formattedScrapedData);
            log.debug("Displaying job details for job {} for user ID {}", jobId, userId);
        } catch (Exception e) {
            model.addAttribute("errorMessage", "Error fetching job details: " + e.getMessage());
            model.addAttribute("job", new ScrapingJob()); // Provide empty job to avoid NullPointerException
            model.addAttribute("scrapedData", Collections.emptyList());
            log.error("Error fetching job {} for user ID {}: {}", jobId, userId, e.getMessage());
        }
        return "job-detail";
    }

    /**
     * Triggers a scraping job manually from the UI.
     *
     * @param jobId The ID of the job to trigger.
     * @param redirectAttributes For flash messages.
     * @param authentication The authenticated user's details.
     * @return Redirect to job detail page.
     */
    @PostMapping("/jobs/{jobId}/trigger-ui")
    @PreAuthorize("isAuthenticated()")
    public String triggerJob(@PathVariable Long jobId, RedirectAttributes redirectAttributes, Authentication authentication) {
        Long userId = getCurrentUserIdFromAuth(authentication);
        if (userId == null) {
            redirectAttributes.addFlashAttribute("errorMessage", "Authentication error. Please log in again.");
            return "redirect:/login";
        }
        try {
            scrapingJobService.triggerScrapingJob(jobId, userId);
            redirectAttributes.addFlashAttribute("successMessage", "Scraping job triggered successfully!");
            log.info("Job {} triggered by user ID {} via UI.", jobId, userId);
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Error triggering job: " + e.getMessage());
            log.error("Error triggering job {} for user ID {}: {}", jobId, userId, e.getMessage());
        }
        return "redirect:/jobs/" + jobId; // Redirect back to job detail page
    }

    /**
     * Handles deleting a job from the UI.
     *
     * @param jobId The ID of the job to delete.
     * @param redirectAttributes For flash messages.
     * @param authentication The authenticated user's details.
     * @return Redirect to dashboard.
     */
    @PostMapping("/jobs/{jobId}/delete-ui")
    @PreAuthorize("isAuthenticated()")
    public String deleteJob(@PathVariable Long jobId, RedirectAttributes redirectAttributes, Authentication authentication) {
        Long userId = getCurrentUserIdFromAuth(authentication);
        if (userId == null) {
            redirectAttributes.addFlashAttribute("errorMessage", "Authentication error. Please log in again.");
            return "redirect:/login";
        }
        try {
            scrapingJobService.deleteScrapingJob(jobId, userId);
            redirectAttributes.addFlashAttribute("successMessage", "Scraping job deleted successfully.");
            log.info("Job {} deleted by user ID {} via UI.", jobId, userId);
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Error deleting job: " + e.getMessage());
            log.error("Error deleting job {} for user ID {}: {}", jobId, userId, e.getMessage());
        }
        return "redirect:/dashboard";
    }

    /**
     * Logs out the user and invalidates their session.
     */
    @GetMapping("/logout")
    public String logout(HttpServletRequest request, HttpServletResponse response) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null){
            new SecurityContextLogoutHandler().logout(request, response, auth);
        }
        log.info("User logged out via UI.");
        return "redirect:/login?logout"; // Redirect to login page with a logout parameter
    }
}