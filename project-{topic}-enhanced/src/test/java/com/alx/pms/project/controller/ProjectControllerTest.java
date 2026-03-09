```java
package com.alx.pms.project.controller;

import com.alx.pms.exception.ForbiddenException;
import com.alx.pms.exception.ResourceNotFoundException;
import com.alx.pms.model.Project;
import com.alx.pms.model.Role;
import com.alx.pms.model.User;
import com.alx.pms.project.dto.ProjectRequest;
import com.alx.pms.project.dto.ProjectResponse;
import com.alx.pms.project.service.ProjectService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProjectController.class)
@ActiveProfiles("test")
class ProjectControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProjectService projectService; // Mock the service layer

    @Autowired
    private ObjectMapper objectMapper;

    private User currentUser;
    private ProjectRequest projectRequest;
    private ProjectResponse projectResponse;

    @BeforeEach
    void setUp() {
        currentUser = new User();
        currentUser.setId(1L);
        currentUser.setUsername("testuser");
        currentUser.setRoles(Set.of(Role.ROLE_USER)); // Set roles for @AuthenticationPrincipal

        projectRequest = new ProjectRequest();
        projectRequest.setName("New Project");
        projectRequest.setDescription("Description for new project");
        projectRequest.setStartDate(LocalDate.now());
        projectRequest.setEndDate(LocalDate.now().plusMonths(1));

        projectResponse = new ProjectResponse();
        projectResponse.setId(10L);
        projectResponse.setName("New Project");
        projectResponse.setDescription("Description for new project");
        projectResponse.setCreatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("POST /api/v1/projects - Should create a new project successfully")
    @WithMockUser(username = "testuser", roles = {"USER"})
    void createProject_Success() throws Exception {
        when(projectService.createProject(any(ProjectRequest.class), eq(currentUser.getId()))).thenReturn(projectResponse);

        mockMvc.perform(post("/api/v1/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(projectRequest))
                        .principal(currentUser)) // Pass the mock user as principal
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(projectResponse.getId()))
                .andExpect(jsonPath("$.name").value(projectResponse.getName()));

        verify(projectService, times(1)).createProject(any(ProjectRequest.class), eq(currentUser.getId()));
    }

    @Test
    @DisplayName("GET /api/v1/projects/{id} - Should get project by ID successfully when owner")
    @WithMockUser(username = "testuser", roles = {"USER"})
    void getProjectById_Owner_Success() throws Exception {
        when(projectService.getProjectById(eq(10L), eq(currentUser.getId()))).thenReturn(projectResponse);

        mockMvc.perform(get("/api/v1/projects/{id}", 10L)
                        .principal(currentUser))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(projectResponse.getId()))
                .andExpect(jsonPath("$.name").value(projectResponse.getName()));

        verify(projectService, times(1)).getProjectById(eq(10L), eq(currentUser.getId()));
    }

    @Test
    @DisplayName("GET /api/v1/projects/{id} - Should return 403 Forbidden when not project owner")
    @WithMockUser(username = "testuser", roles = {"USER"})
    void getProjectById_NotOwner_Forbidden() throws Exception {
        when(projectService.getProjectById(eq(10L), eq(currentUser.getId()))).thenThrow(new ForbiddenException("Access Denied"));

        mockMvc.perform(get("/api/v1/projects/{id}", 10L)
                        .principal(currentUser))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Access Denied")); // Verify custom error response from handler

        verify(projectService, times(1)).getProjectById(eq(10L), eq(currentUser.getId()));
    }

    @Test
    @DisplayName("GET /api/v1/projects/{id} - Should return 404 Not Found for non-existent project")
    @WithMockUser(username = "testuser", roles = {"USER"})
    void getProjectById_NotFound() throws Exception {
        when(projectService.getProjectById(eq(99L), eq(currentUser.getId()))).thenThrow(new ResourceNotFoundException("Project not found"));

        mockMvc.perform(get("/api/v1/projects/{id}", 99L)
                        .principal(currentUser))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Project not found"));

        verify(projectService, times(1)).getProjectById(eq(99L), eq(currentUser.getId()));
    }

    @Test
    @DisplayName("GET /api/v1/projects - Should get all projects for current user successfully")
    @WithMockUser(username = "testuser", roles = {"USER"})
    void getAllProjectsForCurrentUser_Success() throws Exception {
        when(projectService.getAllProjectsForUser(eq(currentUser.getId()))).thenReturn(List.of(projectResponse));

        mockMvc.perform(get("/api/v1/projects")
                        .principal(currentUser))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(projectResponse.getId()))
                .andExpect(jsonPath("$[0].name").value(projectResponse.getName()));

        verify(projectService, times(1)).getAllProjectsForUser(eq(currentUser.getId()));
    }

    @Test
    @DisplayName("PUT /api/v1/projects/{id} - Should update project successfully when owner")
    @WithMockUser(username = "testuser", roles = {"USER"})
    void updateProject_Owner_Success() throws Exception {
        ProjectRequest updateRequest = new ProjectRequest();
        updateRequest.setName("Updated Project");
        updateRequest.setDescription("Updated description");
        updateRequest.setStartDate(LocalDate.now());
        updateRequest.setEndDate(LocalDate.now().plusMonths(2));

        ProjectResponse updatedResponse = new ProjectResponse();
        updatedResponse.setId(10L);
        updatedResponse.setName(updateRequest.getName());
        updatedResponse.setDescription(updateRequest.getDescription());

        when(projectService.updateProject(eq(10L), any(ProjectRequest.class), eq(currentUser.getId()))).thenReturn(updatedResponse);

        mockMvc.perform(put("/api/v1/projects/{id}", 10L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest))
                        .principal(currentUser))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(updatedResponse.getId()))
                .andExpect(jsonPath("$.name").value(updatedResponse.getName()));

        verify(projectService, times(1)).updateProject(eq(10L), any(ProjectRequest.class), eq(currentUser.getId()));
    }

    @Test
    @DisplayName("DELETE /api/v1/projects/{id} - Should delete project successfully when owner")
    @WithMockUser(username = "testuser", roles = {"USER"})
    void deleteProject_Owner_Success() throws Exception {
        doNothing().when(projectService).deleteProject(eq(10L), eq(currentUser.getId()));

        mockMvc.perform(delete("/api/v1/projects/{id}", 10L)
                        .principal(currentUser))
                .andExpect(status().isNoContent());

        verify(projectService, times(1)).deleteProject(eq(10L), eq(currentUser.getId()));
    }

    @Test
    @DisplayName("DELETE /api/v1/projects/{id} - Should return 403 Forbidden when not project owner")
    @WithMockUser(username = "testuser", roles = {"USER"})
    void deleteProject_NotOwner_Forbidden() throws Exception {
        doThrow(new ForbiddenException("Access Denied")).when(projectService).deleteProject(eq(10L), eq(currentUser.getId()));

        mockMvc.perform(delete("/api/v1/projects/{id}", 10L)
                        .principal(currentUser))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Access Denied"));

        verify(projectService, times(1)).deleteProject(eq(10L), eq(currentUser.getId()));
    }

    @Test
    @DisplayName("Unauthorized access to create project should return 401")
    void createProject_Unauthorized() throws Exception {
        mockMvc.perform(post("/api/v1/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(projectRequest)))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(projectService);
    }
}
```