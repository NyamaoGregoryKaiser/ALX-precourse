package com.appinsight.appinsight.controller;

import com.appinsight.appinsight.dto.MonitoredApplicationDTO;
import com.appinsight.appinsight.exception.ResourceNotFoundException;
import com.appinsight.appinsight.service.MonitoredApplicationService;
import com.appinsight.appinsight.service.JwtUserDetailsService;
import com.appinsight.appinsight.util.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MonitoredApplicationController.class)
class MonitoredApplicationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MonitoredApplicationService applicationService;

    @MockBean // Mock Spring Security components required by @WebMvcTest
    private JwtUserDetailsService jwtUserDetailsService;
    @MockBean
    private JwtUtil jwtUtil;

    @Autowired
    private ObjectMapper objectMapper;

    private MonitoredApplicationDTO app1DTO;
    private MonitoredApplicationDTO app2DTO;
    private String adminToken;
    private String userToken;
    private UserDetails adminUserDetails;
    private UserDetails userUserDetails;

    @BeforeEach
    void setUp() {
        app1DTO = MonitoredApplicationDTO.builder()
                .id(1L).name("TestApp1").description("Desc1").apiKey("key1")
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();
        app2DTO = MonitoredApplicationDTO.builder()
                .id(2L).name("TestApp2").description("Desc2").apiKey("key2")
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();

        // Setup mock JWT for authenticated requests
        List<GrantedAuthority> adminAuthorities = Collections.singletonList(new SimpleGrantedAuthority("ROLE_ADMIN"));
        adminUserDetails = new User("admin", "pass", adminAuthorities);
        adminToken = "mockAdminToken";

        List<GrantedAuthority> userAuthorities = Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"));
        userUserDetails = new User("user", "pass", userAuthorities);
        userToken = "mockUserToken";

        // Mock JWT utility to always validate the token and return the mock user
        when(jwtUtil.validateToken(eq(adminToken), any(UserDetails.class))).thenReturn(true);
        when(jwtUtil.extractUsername(adminToken)).thenReturn("admin");
        when(jwtUserDetailsService.loadUserByUsername("admin")).thenReturn(adminUserDetails);

        when(jwtUtil.validateToken(eq(userToken), any(UserDetails.class))).thenReturn(true);
        when(jwtUtil.extractUsername(userToken)).thenReturn("user");
        when(jwtUserDetailsService.loadUserByUsername("user")).thenReturn(userUserDetails);
    }

    @Test
    @DisplayName("GET /api/applications - Should return all applications for ADMIN")
    void getAllApplications_admin_shouldReturnAllApplications() throws Exception {
        when(applicationService.getAllApplications()).thenReturn(Arrays.asList(app1DTO, app2DTO));

        mockMvc.perform(get("/api/applications")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("TestApp1"));

        verify(applicationService, times(1)).getAllApplications();
    }

    @Test
    @DisplayName("GET /api/applications - Should return all applications for USER")
    void getAllApplications_user_shouldReturnAllApplications() throws Exception {
        when(applicationService.getAllApplications()).thenReturn(Arrays.asList(app1DTO, app2DTO));

        mockMvc.perform(get("/api/applications")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("TestApp1"));

        verify(applicationService, times(1)).getAllApplications();
    }

    @Test
    @DisplayName("GET /api/applications/{id} - Should return application by ID for ADMIN")
    void getApplicationById_admin_shouldReturnApplication() throws Exception {
        when(applicationService.getApplicationById(1L)).thenReturn(app1DTO);

        mockMvc.perform(get("/api/applications/{id}", 1L)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("TestApp1"));

        verify(applicationService, times(1)).getApplicationById(1L);
    }

    @Test
    @DisplayName("GET /api/applications/{id} - Should return 404 if application not found")
    void getApplicationById_shouldReturnNotFound() throws Exception {
        when(applicationService.getApplicationById(anyLong())).thenThrow(new ResourceNotFoundException("Not found"));

        mockMvc.perform(get("/api/applications/{id}", 99L)
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());

        verify(applicationService, times(1)).getApplicationById(99L);
    }

    @Test
    @DisplayName("POST /api/applications - Should create application for ADMIN")
    void createApplication_admin_shouldCreateApplication() throws Exception {
        MonitoredApplicationDTO newAppRequest = MonitoredApplicationDTO.builder().name("NewApp").description("New App Desc").build();
        when(applicationService.createApplication(any(MonitoredApplicationDTO.class))).thenReturn(app1DTO); // Return a mocked DTO for simplicity

        mockMvc.perform(post("/api/applications")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newAppRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("TestApp1"));

        verify(applicationService, times(1)).createApplication(any(MonitoredApplicationDTO.class));
    }

    @Test
    @DisplayName("POST /api/applications - Should return 403 for USER")
    void createApplication_user_shouldReturnForbidden() throws Exception {
        MonitoredApplicationDTO newAppRequest = MonitoredApplicationDTO.builder().name("NewApp").description("New App Desc").build();

        mockMvc.perform(post("/api/applications")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newAppRequest)))
                .andExpect(status().isForbidden());

        verify(applicationService, never()).createApplication(any(MonitoredApplicationDTO.class));
    }

    @Test
    @DisplayName("PUT /api/applications/{id} - Should update application for ADMIN")
    void updateApplication_admin_shouldUpdateApplication() throws Exception {
        MonitoredApplicationDTO updateRequest = MonitoredApplicationDTO.builder().name("UpdatedApp").description("Updated Desc").build();
        MonitoredApplicationDTO updatedDTO = MonitoredApplicationDTO.builder()
                .id(1L).name("UpdatedApp").description("Updated Desc").apiKey("key1")
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();

        when(applicationService.updateApplication(eq(1L), any(MonitoredApplicationDTO.class))).thenReturn(updatedDTO);

        mockMvc.perform(put("/api/applications/{id}", 1L)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("UpdatedApp"));

        verify(applicationService, times(1)).updateApplication(eq(1L), any(MonitoredApplicationDTO.class));
    }

    @Test
    @DisplayName("DELETE /api/applications/{id} - Should delete application for ADMIN")
    void deleteApplication_admin_shouldDeleteApplication() throws Exception {
        doNothing().when(applicationService).deleteApplication(1L);

        mockMvc.perform(delete("/api/applications/{id}", 1L)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());

        verify(applicationService, times(1)).deleteApplication(1L);
    }

    @Test
    @DisplayName("DELETE /api/applications/{id} - Should return 403 for USER")
    void deleteApplication_user_shouldReturnForbidden() throws Exception {
        mockMvc.perform(delete("/api/applications/{id}", 1L)
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());

        verify(applicationService, never()).deleteApplication(anyLong());
    }

    @Test
    @DisplayName("Unauthenticated access to protected endpoint should return 401 Unauthorized")
    void protectedEndpoint_shouldReturnUnauthorized_whenNoToken() throws Exception {
        mockMvc.perform(get("/api/applications")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());

        verify(applicationService, never()).getAllApplications();
    }
}