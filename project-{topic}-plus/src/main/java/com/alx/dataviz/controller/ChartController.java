```java
package com.alx.dataviz.controller;

import com.alx.dataviz.dto.ChartDto;
import com.alx.dataviz.dto.DataPointDto;
import com.alx.dataviz.service.ChartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/charts")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasAnyRole('USER', 'ADMIN')") // All chart ops require authentication
public class ChartController {

    private final ChartService chartService;

    @PostMapping
    public ResponseEntity<ChartDto> createChart(@Valid @RequestBody ChartDto chartDto) {
        log.info("POST /api/charts - Creating new chart: {}", chartDto.getTitle());
        ChartDto createdChart = chartService.createChart(chartDto);
        return new ResponseEntity<>(createdChart, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN') or @chartSecurity.isOwner(#id)")
    public ResponseEntity<ChartDto> getChartById(@PathVariable Long id) {
        log.debug("GET /api/charts/{}", id);
        ChartDto chart = chartService.getChartById(id);
        return ResponseEntity.ok(chart);
    }

    @GetMapping("/dashboard/{dashboardId}")
    @PreAuthorize("hasAnyRole('ADMIN') or @dashboardSecurity.isOwner(#dashboardId)") // Check dashboard ownership
    public ResponseEntity<List<ChartDto>> getChartsByDashboardId(@PathVariable Long dashboardId) {
        log.debug("GET /api/charts/dashboard/{}", dashboardId);
        List<ChartDto> charts = chartService.getChartsByDashboardId(dashboardId);
        return ResponseEntity.ok(charts);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN') or @chartSecurity.isOwner(#id)")
    public ResponseEntity<ChartDto> updateChart(@PathVariable Long id, @Valid @RequestBody ChartDto chartDto) {
        log.info("PUT /api/charts/{}", id);
        ChartDto updatedChart = chartService.updateChart(id, chartDto);
        return ResponseEntity.ok(updatedChart);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN') or @chartSecurity.isOwner(#id)")
    public ResponseEntity<Void> deleteChart(@PathVariable Long id) {
        log.info("DELETE /api/charts/{}", id);
        chartService.deleteChart(id);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    @GetMapping("/{id}/data")
    @PreAuthorize("hasAnyRole('ADMIN') or @chartSecurity.isOwner(#id)")
    public ResponseEntity<List<DataPointDto>> getChartData(@PathVariable Long id) {
        log.debug("GET /api/charts/{}/data", id);
        List<DataPointDto> chartData = chartService.getChartData(id);
        return ResponseEntity.ok(chartData);
    }
}
```