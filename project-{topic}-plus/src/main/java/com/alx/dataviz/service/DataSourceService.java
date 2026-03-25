```java
package com.alx.dataviz.service;

import com.alx.dataviz.dto.DataPointDto;
import com.alx.dataviz.dto.DataSourceDto;
import com.alx.dataviz.exception.ResourceNotFoundException;
import com.alx.dataviz.exception.UnauthorizedException;
import com.alx.dataviz.model.DataSource;
import com.alx.dataviz.model.Role;
import com.alx.dataviz.model.User;
import com.alx.dataviz.repository.DataSourceRepository;
import com.alx.dataviz.repository.UserRepository;
import com.alx.dataviz.util.DataProcessor;
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

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DataSourceService {

    private final DataSourceRepository dataSourceRepository;
    private final UserRepository userRepository;
    private final ModelMapper modelMapper;
    private final DataProcessor dataProcessor; // For processing raw data

    @Transactional
    public DataSourceDto createDataSource(DataSourceDto dataSourceDto) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User owner = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new UnauthorizedException("Authenticated user not found."));

        DataSource dataSource = modelMapper.map(dataSourceDto, DataSource.class);
        dataSource.setOwner(owner);

        DataSource savedDataSource = dataSourceRepository.save(dataSource);
        log.info("Created new data source: {} by user {}", savedDataSource.getName(), currentUsername);
        return modelMapper.map(savedDataSource, DataSourceDto.class);
    }

    @Cacheable(value = "dataSources", key = "#id")
    public DataSourceDto getDataSourceById(Long id) {
        log.debug("Fetching data source by ID: {}", id);
        DataSource dataSource = dataSourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Data Source not found with id: " + id));
        if (!isAuthorized(dataSource.getOwner().getUsername(), Role.ADMIN)) {
            throw new UnauthorizedException("You are not authorized to view this data source.");
        }
        return mapToDto(dataSource);
    }

    public Page<DataSourceDto> getAllDataSources(Pageable pageable) {
        log.debug("Fetching all data sources, page: {}, size: {}", pageable.getPageNumber(), pageable.getPageSize());
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new UnauthorizedException("Authenticated user not found."));

        // Admins can see all, regular users only their own
        if (currentUser.getRoles().contains(Role.ADMIN)) {
            return dataSourceRepository.findAll(pageable).map(this::mapToDto);
        } else {
            return dataSourceRepository.findByOwner(currentUser, pageable).map(this::mapToDto);
        }
    }

    @Transactional
    @CacheEvict(value = "dataSources", key = "#id")
    public DataSourceDto updateDataSource(Long id, DataSourceDto dataSourceDto) {
        DataSource existingDataSource = dataSourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Data Source not found with id: " + id));

        if (!isAuthorized(existingDataSource.getOwner().getUsername(), Role.ADMIN)) {
            throw new UnauthorizedException("You are not authorized to update this data source.");
        }

        existingDataSource.setName(dataSourceDto.getName());
        existingDataSource.setConnectionDetails(dataSourceDto.getConnectionDetails());
        existingDataSource.setType(dataSourceDto.getType());
        existingDataSource.setSchemaDefinition(dataSourceDto.getSchemaDefinition());

        DataSource updatedDataSource = dataSourceRepository.save(existingDataSource);
        log.info("Updated data source: {} (ID: {})", updatedDataSource.getName(), updatedDataSource.getId());
        return mapToDto(updatedDataSource);
    }

    @Transactional
    @CacheEvict(value = "dataSources", key = "#id")
    public void deleteDataSource(Long id) {
        DataSource existingDataSource = dataSourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Data Source not found with id: " + id));

        if (!isAuthorized(existingDataSource.getOwner().getUsername(), Role.ADMIN)) {
            throw new UnauthorizedException("You are not authorized to delete this data source.");
        }

        dataSourceRepository.delete(existingDataSource);
        log.info("Deleted data source with ID: {}", id);
    }

    /**
     * Fetches and processes data from a data source. This simulates data retrieval
     * from various sources and formats it into a list of DataPointDto.
     *
     * @param id The ID of the data source.
     * @return A list of DataPointDto representing the processed data.
     */
    @Cacheable(value = "dataSourceData", key = "#id")
    public List<DataPointDto> getProcessedDataSourceData(Long id) {
        DataSource dataSource = dataSourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Data Source not found with id: " + id));

        if (!isAuthorized(dataSource.getOwner().getUsername(), Role.ADMIN)) {
            throw new UnauthorizedException("You are not authorized to access data from this source.");
        }

        log.debug("Processing data for data source: {} (Type: {})", dataSource.getName(), dataSource.getType());
        // Delegate to DataProcessor utility
        return dataProcessor.processData(dataSource);
    }

    private DataSourceDto mapToDto(DataSource dataSource) {
        DataSourceDto dto = modelMapper.map(dataSource, DataSourceDto.class);
        dto.setOwnerId(dataSource.getOwner().getId());
        dto.setOwnerUsername(dataSource.getOwner().getUsername());
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