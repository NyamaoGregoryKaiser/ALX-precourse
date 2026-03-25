```java
package com.alx.dataviz.service;

import com.alx.dataviz.dto.ChartDto;
import com.alx.dataviz.dto.DataPointDto;
import com.alx.dataviz.exception.ResourceNotFoundException;
import com.alx.dataviz.exception.UnauthorizedException;
import com.alx.dataviz.model.Chart;
import com.alx.dataviz.model.Dashboard;
import com.alx.dataviz.model.DataSource;
import com.alx.dataviz.model.Role;
import com.alx.dataviz.repository.ChartRepository;
import com.alx.dataviz.repository.DashboardRepository;
import com.alx.dataviz.repository.DataSourceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChartService {

    private final ChartRepository chartRepository;
    private final DashboardRepository dashboardRepository;
    private final DataSourceRepository dataSourceRepository;
    private final DataSourceService dataSourceService; // To fetch processed data
    private final ModelMapper modelMapper;

    @Transactional
    public ChartDto createChart(ChartDto chartDto) {
        Dashboard dashboard = dashboardRepository.findById(chartDto.getDashboardId())
                .orElseThrow(() -> new ResourceNotFoundException("Dashboard not found with id: " + chartDto.getDashboardId()));
        DataSource dataSource = dataSourceRepository.findById(chartDto.getDataSourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Data Source not found with id: " + chartDto.getDataSourceId()));

        if (!isAuthorized(dashboard.getOwner().getUsername(), Role.ADMIN)) {
            throw new UnauthorizedException("You are not authorized to add charts to this dashboard.");
        }
        // Also check if user owns the data source or if it's public
        if (!isAuthorized(dataSource.getOwner().getUsername(), Role.ADMIN)) {
            throw new UnauthorizedException("You are not authorized to use this data source for charts.");
        }

        Chart chart = modelMapper.map(chartDto, Chart.class);
        chart.setDashboard(dashboard);
        chart.setDataSource(dataSource);

        Chart savedChart = chartRepository.save(chart);
        log.info("Created new chart: {} for dashboard {}", savedChart.getTitle(), dashboard.getName());
        return mapToDto(savedChart);
    }

    @Cacheable(value = "charts", key = "#id")
    public ChartDto getChartById(Long id) {
        log.debug("Fetching chart by ID: {}", id);
        Chart chart = chartRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Chart not found with id: " + id));

        if (!isAuthorized(chart.getDashboard().getOwner().getUsername(), Role.ADMIN)) {
            throw new UnauthorizedException("You are not authorized to view this chart.");
        }
        return mapToDto(chart);
    }

    public List<ChartDto> getChartsByDashboardId(Long dashboardId) {
        log.debug("Fetching charts for dashboard ID: {}", dashboardId);
        Dashboard dashboard = dashboardRepository.findById(dashboardId)
                .orElseThrow(() -> new ResourceNotFoundException("Dashboard not found with id: " + dashboardId));

        if (!isAuthorized(dashboard.getOwner().getUsername(), Role.ADMIN)) {
            throw new UnauthorizedException("You are not authorized to view charts for this dashboard.");
        }

        return chartRepository.findByDashboard(dashboard).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    @CacheEvict(value = "charts", key = "#id")
    public ChartDto updateChart(Long id, ChartDto chartDto) {
        Chart existingChart = chartRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Chart not found with id: " + id));

        if (!isAuthorized(existingChart.getDashboard().getOwner().getUsername(), Role.ADMIN)) {
            throw new UnauthorizedException("You are not authorized to update this chart.");
        }

        Dashboard dashboard = dashboardRepository.findById(chartDto.getDashboardId())
                .orElseThrow(() -> new ResourceNotFoundException("Dashboard not found with id: " + chartDto.getDashboardId()));
        DataSource dataSource = dataSourceRepository.findById(chartDto.getDataSourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Data Source not found with id: " + chartDto.getDataSourceId()));

        // Ensure the new dashboard/data source also belongs to an authorized user
        if (!isAuthorized(dashboard.getOwner().getUsername(), Role.ADMIN) || !isAuthorized(dataSource.getOwner().getUsername(), Role.ADMIN)) {
            throw new UnauthorizedException("You are not authorized to link to the specified dashboard or data source.");
        }

        existingChart.setTitle(chartDto.getTitle());
        existingChart.setDescription(chartDto.getDescription());
        existingChart.setType(chartDto.getType());
        existingChart.setConfiguration(chartDto.getConfiguration());
        existingChart.setDashboard(dashboard);
        existingChart.setDataSource(dataSource);

        Chart updatedChart = chartRepository.save(existingChart);
        log.info("Updated chart: {} (ID: {})", updatedChart.getTitle(), updatedChart.getId());
        return mapToDto(updatedChart);
    }

    @Transactional
    @CacheEvict(value = "charts", key = "#id")
    public void deleteChart(Long id) {
        Chart existingChart = chartRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Chart not found with id: " + id));

        if (!isAuthorized(existingChart.getDashboard().getOwner().getUsername(), Role.ADMIN)) {
            throw new UnauthorizedException("You are not authorized to delete this chart.");
        }

        chartRepository.delete(existingChart);
        log.info("Deleted chart with ID: {}", id);
    }

    /**
     * Retrieves the raw data points for a given chart's data source, then applies chart-specific configurations
     * for aggregation/filtering if needed.
     * @param chartId The ID of the chart.
     * @return A list of DataPointDto for visualization.
     */
    @Cacheable(value = "chartData", key = "#chartId")
    public List<DataPointDto> getChartData(Long chartId) {
        Chart chart = chartRepository.findById(chartId)
                .orElseThrow(() -> new ResourceNotFoundException("Chart not found with id: " + chartId));

        if (!isAuthorized(chart.getDashboard().getOwner().getUsername(), Role.ADMIN)) {
            throw new UnauthorizedException("You are not authorized to view data for this chart.");
        }

        log.debug("Fetching data for chart: {} (ID: {})", chart.getTitle(), chart.getId());

        // 1. Get raw/processed data from the data source
        List<DataPointDto> rawData = dataSourceService.getProcessedDataSourceData(chart.getDataSource().getId());

        // 2. Apply chart-specific processing (e.g., aggregation, filtering based on 'configuration' field)
        // This is a placeholder for more complex logic that would interpret `chart.getConfiguration()`
        // For example, if configuration specifies "group by category, sum value", apply that here.
        List<DataPointDto> processedChartData = rawData; // For now, just pass through.
                                                         // In a real app, this would involve parsing `chart.getConfiguration()`
                                                         // (e.g., using a JSON library like Jackson) and applying transformations.

        log.info("Successfully retrieved {} data points for chart ID: {}", processedChartData.size(), chartId);
        return processedChartData;
    }

    public ChartDto mapToDto(Chart chart) {
        ChartDto dto = modelMapper.map(chart, ChartDto.class);
        dto.setDataSourceId(chart.getDataSource().getId());
        dto.setDataSourceName(chart.getDataSource().getName());
        dto.setDashboardId(chart.getDashboard().getId());
        dto.setDashboardName(chart.getDashboard().getName());
        return dto;
    }

    public ChartDto mapToDtoWithoutDashboard(Chart chart) {
        ChartDto dto = modelMapper.map(chart, ChartDto.class);
        dto.setDataSourceId(chart.getDataSource().getId());
        dto.setDataSourceName(chart.getDataSource().getName());
        // Do not set dashboardId/Name to prevent recursion if mapping a DashboardDto
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