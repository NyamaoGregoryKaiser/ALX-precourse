```java
package com.alx.dataviz.controller;

import com.alx.dataviz.dto.DashboardDto;
import com.alx.dataviz.model.Dashboard;
import com.alx.dataviz.model.Role;
import com.alx.dataviz.model.User;
import com.alx.dataviz.repository.DashboardRepository;
import com.alx.dataviz.repository.UserRepository;
import com.alx.dataviz.service.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Collections;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Transactional
class DashboardControllerTest {

    @Container
    public static PostgreSQLContainer<?> postgresContainer = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("testuser")
            .withPassword("testpass");

    @DynamicPropertySource
    static void setDatasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgresContainer::getJdbcUrl);
        registry.add("spring.datasource.username", postgresContainer::getUsername);
        registry.add("spring.datasource.password", postgresContainer::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "update");
        registry.add("application.security.jwt.secret-key", () -> "c2VjcmV0S2V5Rm9yVGVzdGluZ0pXVE1hc2hvMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI=");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DashboardRepository dashboardRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private User ownerUser;
    private User otherUser;
    private User adminUser;
    private String ownerToken;
    private String otherUserToken;
    private String adminToken;
    private Dashboard testDashboard;

    @BeforeEach
    void setUp() {
        dashboardRepository.deleteAll();
        userRepository.deleteAll();

        ownerUser = User.builder()
                .username("dashboard_owner")
                .email("owner@example.com")
                .password(passwordEncoder.encode("password123"))
                .roles(Collections.singleton(Role.USER))
                .build();
        userRepository.save(ownerUser);

        otherUser = User.builder()
                .username("other_user")
                .email("other@example.com")
                .password(passwordEncoder.encode("password123"))
                .roles(Collections.singleton(Role.USER))
                .build();
        userRepository.save(otherUser);

        adminUser = User.builder()
                .username("admin_user")
                .email("admin@example.com")
                .password(passwordEncoder.encode("adminpass"))
                .roles(Set.of(Role.ADMIN, Role.USER))
                .build();
        userRepository.save(adminUser);

        ownerToken = jwtService.generateToken(new org.springframework.security.core.userdetails.User(ownerUser.getUsername(), ownerUser.getPassword(), Collections.singleton(new SimpleGrantedAuthority(Role.USER.getAuthority()))));
        otherUserToken = jwtService.generateToken(new org.springframework.security.core.userdetails.User(otherUser.getUsername(), otherUser.getPassword(), Collections.singleton(new SimpleGrantedAuthority(Role.USER.getAuthority()))));
        adminToken = jwtService.generateToken(new org.springframework.security.core.userdetails.User(adminUser.getUsername(), adminUser.getPassword(), Set.of(new SimpleGrantedAuthority(Role.ADMIN.getAuthority()), new SimpleGrantedAuthority(Role.USER.getAuthority()))));

        testDashboard = Dashboard.builder()
                .name("My Test Dashboard")
                .description("A description")
                .owner(ownerUser)
                .build();
        dashboardRepository.save(testDashboard);
    }

    @Test
    @DisplayName("Should create a new dashboard for owner and return 201 Created")
    void createDashboard_OwnerSuccess() throws Exception {
        DashboardDto newDashboardDto = new DashboardDto();
        newDashboardDto.setName("New Dashboard by Owner");
        newDashboardDto.setDescription("Description of new dashboard");

        mockMvc.perform(post("/api/dashboards")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newDashboardDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("New Dashboard by Owner"))
                .andExpect(jsonPath("$.ownerUsername").value(ownerUser.getUsername()));

        assertThat(dashboardRepository.findByName("New Dashboard by Owner")).isPresent();
    }

    @Test
    @DisplayName("Should return 401 Unauthorized if no token provided for createDashboard")
    void createDashboard_NoAuth() throws Exception {
        DashboardDto newDashboardDto = new DashboardDto();
        newDashboardDto.setName("Unauthorized Dashboard");

        mockMvc.perform(post("/api/dashboards")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newDashboardDto)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Should get dashboard by ID for owner and return 200 OK")
    void getDashboardById_OwnerSuccess() throws Exception {
        mockMvc.perform(get("/api/dashboards/{id}", testDashboard.getId())
                        .header("Authorization", "Bearer " + ownerToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(testDashboard.getName()))
                .andExpect(jsonPath("$.ownerUsername").value(ownerUser.getUsername()));
    }

    @Test
    @DisplayName("Should get dashboard by ID for admin and return 200 OK")
    void getDashboardById_AdminSuccess() throws Exception {
        mockMvc.perform(get("/api/dashboards/{id}", testDashboard.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(testDashboard.getName()));
    }

    @Test
    @DisplayName("Should return 403 Forbidden for non-owner/non-admin trying to get dashboard")
    void getDashboardById_Forbidden() throws Exception {
        mockMvc.perform(get("/api/dashboards/{id}", testDashboard.getId())
                        .header("Authorization", "Bearer " + otherUserToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Should update dashboard for owner and return 200 OK")
    void updateDashboard_OwnerSuccess() throws Exception {
        DashboardDto updatedDto = new DashboardDto();
        updatedDto.setName("Updated Dashboard Name");
        updatedDto.setDescription("New Description");

        mockMvc.perform(put("/api/dashboards/{id}", testDashboard.getId())
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Dashboard Name"))
                .andExpect(jsonPath("$.description").value("New Description"));

        assertThat(dashboardRepository.findById(testDashboard.getId()).get().getName()).isEqualTo("Updated Dashboard Name");
    }

    @Test
    @DisplayName("Should return 403 Forbidden for non-owner/non-admin trying to update dashboard")
    void updateDashboard_Forbidden() throws Exception {
        DashboardDto updatedDto = new DashboardDto();
        updatedDto.setName("Attempted Update");

        mockMvc.perform(put("/api/dashboards/{id}", testDashboard.getId())
                        .header("Authorization", "Bearer " + otherUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedDto)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Should delete dashboard for owner and return 204 No Content")
    void deleteDashboard_OwnerSuccess() throws Exception {
        mockMvc.perform(delete("/api/dashboards/{id}", testDashboard.getId())
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isNoContent());

        assertThat(dashboardRepository.findById(testDashboard.getId())).isNotPresent();
    }

    @Test
    @DisplayName("Should return 403 Forbidden for non-owner/non-admin trying to delete dashboard")
    void deleteDashboard_Forbidden() throws Exception {
        mockMvc.perform(delete("/api/dashboards/{id}", testDashboard.getId())
                        .header("Authorization", "Bearer " + otherUserToken))
                .andExpect(status().isForbidden());

        assertThat(dashboardRepository.findById(testDashboard.getId())).isPresent(); // Should not be deleted
    }

    @Test
    @DisplayName("Should get all dashboards for owner (only their own) and return 200 OK")
    void getAllDashboards_OwnerSuccess() throws Exception {
        Dashboard otherDashboard = Dashboard.builder()
                .name("Other User's Dashboard")
                .description("Dashboard by other user")
                .owner(otherUser)
                .build();
        dashboardRepository.save(otherDashboard);

        mockMvc.perform(get("/api/dashboards")
                        .header("Authorization", "Bearer " + ownerToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].name").value(testDashboard.getName()));
    }

    @Test
    @DisplayName("Should get all dashboards for admin (all dashboards) and return 200 OK")
    void getAllDashboards_AdminSuccess() throws Exception {
        Dashboard otherDashboard = Dashboard.builder()
                .name("Other User's Dashboard")
                .description("Dashboard by other user")
                .owner(otherUser)
                .build();
        dashboardRepository.save(otherDashboard);

        mockMvc.perform(get("/api/dashboards")
                        .header("Authorization", "Bearer " + adminToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2)); // Both owner's and other user's
    }
}
```