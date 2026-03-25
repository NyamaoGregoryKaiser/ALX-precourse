```java
package com.alx.dataviz.service;

import com.alx.dataviz.dto.DashboardDto;
import com.alx.dataviz.exception.ResourceNotFoundException;
import com.alx.dataviz.exception.UnauthorizedException;
import com.alx.dataviz.model.Dashboard;
import com.alx.dataviz.model.Role;
import com.alx.dataviz.model.User;
import com.alx.dataviz.repository.DashboardRepository;
import com.alx.dataviz.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private final DashboardRepository dashboardRepository;
    private final UserRepository userRepository;
    private final ModelMapper modelMapper;
    private final ChartService chartService; // To map charts within dashboard DTO

    @Transactional
    public DashboardDto createDashboard(DashboardDto dashboardDto) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User owner = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new UnauthorizedException("Authenticated user not found."));

        Dashboard dashboard = modelMapper.map(dashboardDto, Dashboard.class);
        dashboard.setOwner(owner);

        Dashboard savedDashboard = dashboardRepository.save(dashboard);
        log.info("Created new dashboard: {} by user {}", savedDashboard.getName(), currentUsername);
        return mapToDto(savedDashboard);
    }

    @Cacheable(value = "dashboards", key = "#id")
    public DashboardDto getDashboardById(Long id) {
        log.debug("Fetching dashboard by ID: {}", id);
        Dashboard dashboard = dashboardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dashboard not found with id: " + id));

        if (!isAuthorized(dashboard.getOwner().getUsername(), Role.ADMIN)) {
            throw new UnauthorizedException("You are not authorized to view this dashboard.");
        }
        return mapToDto(dashboard);
    }

    public Page<DashboardDto> getAllDashboards(Pageable pageable) {
        log.debug("Fetching all dashboards, page: {}, size: {}", pageable.getPageNumber(), pageable.getPageSize());
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new UnauthorizedException("Authenticated user not found."));

        if (currentUser.getRoles().contains(Role.ADMIN)) {
            return dashboardRepository.findAll(pageable).map(this::mapToDto);
        } else {
            return dashboardRepository.findByOwner(currentUser, pageable).map(this::mapToDto);
        }
    }

    @Transactional
    @CacheEvict(value = "dashboards", key = "#id")
    public DashboardDto updateDashboard(Long id, DashboardDto dashboardDto) {
        Dashboard existingDashboard = dashboardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dashboard not found with id: " + id));

        if (!isAuthorized(existingDashboard.getOwner().getUsername(), Role.ADMIN)) {
            throw new UnauthorizedException("You are not authorized to update this dashboard.");
        }

        existingDashboard.setName(dashboardDto.getName());
        existingDashboard.setDescription(dashboardDto.getDescription());

        Dashboard updatedDashboard = dashboardRepository.save(existingDashboard);
        log.info("Updated dashboard: {} (ID: {})", updatedDashboard.getName(), updatedDashboard.getId());
        return mapToDto(updatedDashboard);
    }

    @Transactional
    @CacheEvict(value = "dashboards", key = "#id")
    public void deleteDashboard(Long id) {
        Dashboard existingDashboard = dashboardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dashboard not found with id: " + id));

        if (!isAuthorized(existingDashboard.getOwner().getUsername(), Role.ADMIN)) {
            throw new UnauthorizedException("You are not authorized to delete this dashboard.");
        }

        // Charts associated with this dashboard will also be deleted due to cascade or orphaned removal if configured,
        // or they might need to be explicitly disassociated/deleted depending on business rules.
        // For simplicity, we assume they are handled by cascade in DB or implicitly.
        dashboardRepository.delete(existingDashboard);
        log.info("Deleted dashboard with ID: {}", id);
    }

    private DashboardDto mapToDto(Dashboard dashboard) {
        DashboardDto dto = modelMapper.map(dashboard, DashboardDto.class);
        dto.setOwnerId(dashboard.getOwner().getId());
        dto.setOwnerUsername(dashboard.getOwner().getUsername());
        // Map charts if they exist and are needed
        if (dashboard.getCharts() != null && !dashboard.getCharts().isEmpty()) {
            dto.setCharts(dashboard.getCharts().stream()
                    .map(chartService::mapToDtoWithoutDashboard) // Avoid circular dependency/infinite recursion
                    .collect(Collectors.toList()));
        }
        return dto;
    }

    private boolean isAuthorized(String resourceOwnerUsername, Role requiredRole) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        if (!(principal instanceof UserDetails)) {
            return false; // Not authenticated or anonymous user
        }

        UserDetails currentUser = (UserDetails) principal;
        // Check for ADMIN role
        if (currentUser.getAuthorities().stream()
                .anyMatch(grantedAuthority -> grantedAuthority.getAuthority().equals(Role.ADMIN.getAuthority()))) {
            return true;
        }

        // Check if the current user is the resource owner
        if (resourceOwnerUsername != null && currentUser.getUsername().equals(resourceOwnerUsername)) {
            return true;
        }
        return false;
    }
}
```