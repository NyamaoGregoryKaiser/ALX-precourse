```java
package com.alx.dataviz.controller;

import com.alx.dataviz.dto.DashboardDto;
import com.alx.dataviz.service.DashboardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboards")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasAnyRole('USER', 'ADMIN')") // All dashboard ops require authentication
public class DashboardController {

    private final DashboardService dashboardService;

    @PostMapping
    public ResponseEntity<DashboardDto> createDashboard(@Valid @RequestBody DashboardDto dashboardDto) {
        log.info("POST /api/dashboards - Creating new dashboard: {}", dashboardDto.getName());
        DashboardDto createdDashboard = dashboardService.createDashboard(dashboardDto);
        return new ResponseEntity<>(createdDashboard, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN') or @dashboardSecurity.isOwner(#id)")
    public ResponseEntity<DashboardDto> getDashboardById(@PathVariable Long id) {
        log.debug("GET /api/dashboards/{}", id);
        DashboardDto dashboard = dashboardService.getDashboardById(id);
        return ResponseEntity.ok(dashboard);
    }

    @GetMapping
    public ResponseEntity<Page<DashboardDto>> getAllDashboards(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String[] sort) {
        log.debug("GET /api/dashboards?page={}&size={}&sort={}", page, size, String.join(",", sort));
        Sort.Direction direction = Sort.Direction.fromString(sort[1]);
        PageRequest pageable = PageRequest.of(page, size, Sort.by(direction, sort[0]));
        Page<DashboardDto> dashboards = dashboardService.getAllDashboards(pageable);
        return ResponseEntity.ok(dashboards);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN') or @dashboardSecurity.isOwner(#id)")
    public ResponseEntity<DashboardDto> updateDashboard(@PathVariable Long id, @Valid @RequestBody DashboardDto dashboardDto) {
        log.info("PUT /api/dashboards/{}", id);
        DashboardDto updatedDashboard = dashboardService.updateDashboard(id, dashboardDto);
        return ResponseEntity.ok(updatedDashboard);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN') or @dashboardSecurity.isOwner(#id)")
    public ResponseEntity<Void> deleteDashboard(@PathVariable Long id) {
        log.info("DELETE /api/dashboards/{}", id);
        dashboardService.deleteDashboard(id);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}
```