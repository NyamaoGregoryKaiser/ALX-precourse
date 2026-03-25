```java
package com.alx.dataviz.controller;

import com.alx.dataviz.dto.DataPointDto;
import com.alx.dataviz.dto.DataSourceDto;
import com.alx.dataviz.service.DataSourceService;
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

import java.util.List;

@RestController
@RequestMapping("/api/data-sources")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasAnyRole('USER', 'ADMIN')") // All data source ops require authentication
public class DataSourceController {

    private final DataSourceService dataSourceService;

    @PostMapping
    public ResponseEntity<DataSourceDto> createDataSource(@Valid @RequestBody DataSourceDto dataSourceDto) {
        log.info("POST /api/data-sources - Creating new data source: {}", dataSourceDto.getName());
        DataSourceDto createdDataSource = dataSourceService.createDataSource(dataSourceDto);
        return new ResponseEntity<>(createdDataSource, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN') or @dataSourceSecurity.isOwner(#id)")
    public ResponseEntity<DataSourceDto> getDataSourceById(@PathVariable Long id) {
        log.debug("GET /api/data-sources/{}", id);
        DataSourceDto dataSource = dataSourceService.getDataSourceById(id);
        return ResponseEntity.ok(dataSource);
    }

    @GetMapping
    public ResponseEntity<Page<DataSourceDto>> getAllDataSources(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String[] sort) {
        log.debug("GET /api/data-sources?page={}&size={}&sort={}", page, size, String.join(",", sort));
        Sort.Direction direction = Sort.Direction.fromString(sort[1]);
        PageRequest pageable = PageRequest.of(page, size, Sort.by(direction, sort[0]));
        Page<DataSourceDto> dataSources = dataSourceService.getAllDataSources(pageable);
        return ResponseEntity.ok(dataSources);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN') or @dataSourceSecurity.isOwner(#id)")
    public ResponseEntity<DataSourceDto> updateDataSource(@PathVariable Long id, @Valid @RequestBody DataSourceDto dataSourceDto) {
        log.info("PUT /api/data-sources/{}", id);
        DataSourceDto updatedDataSource = dataSourceService.updateDataSource(id, dataSourceDto);
        return ResponseEntity.ok(updatedDataSource);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN') or @dataSourceSecurity.isOwner(#id)")
    public ResponseEntity<Void> deleteDataSource(@PathVariable Long id) {
        log.info("DELETE /api/data-sources/{}", id);
        dataSourceService.deleteDataSource(id);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    @GetMapping("/{id}/data")
    @PreAuthorize("hasAnyRole('ADMIN') or @dataSourceSecurity.isOwner(#id)")
    public ResponseEntity<List<DataPointDto>> getDataSourceData(@PathVariable Long id) {
        log.debug("GET /api/data-sources/{}/data", id);
        List<DataPointDto> data = dataSourceService.getProcessedDataSourceData(id);
        return ResponseEntity.ok(data);
    }
}
```