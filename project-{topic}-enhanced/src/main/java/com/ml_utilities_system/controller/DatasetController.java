package com.ml_utilities_system.controller;

import com.ml_utilities_system.dto.DatasetDTO;
import com.ml_utilities_system.service.DatasetService;
import com.ml_utilities_system.interceptor.RateLimited;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/datasets")
public class DatasetController {

    @Autowired
    private DatasetService datasetService;

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'MODERATOR', 'ADMIN')")
    @RateLimited(key = "getDatasetById", limit = 10, durationSeconds = 60)
    public ResponseEntity<DatasetDTO> getDatasetById(@PathVariable Long id) {
        DatasetDTO dataset = datasetService.getDatasetById(id);
        return ResponseEntity.ok(dataset);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'MODERATOR', 'ADMIN')")
    @RateLimited(key = "getAllDatasets", limit = 30, durationSeconds = 60)
    public ResponseEntity<Page<DatasetDTO>> getAllDatasets(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id,asc") String[] sort) {
        Sort.Direction direction = Sort.Direction.fromString(sort[1]);
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sort[0]));
        Page<DatasetDTO> datasets = datasetService.getAllDatasets(pageable);
        return ResponseEntity.ok(datasets);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
    public ResponseEntity<DatasetDTO> createDataset(@Valid @RequestBody DatasetDTO datasetDTO) {
        DatasetDTO createdDataset = datasetService.createDataset(datasetDTO);
        return new ResponseEntity<>(createdDataset, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
    public ResponseEntity<DatasetDTO> updateDataset(@PathVariable Long id, @Valid @RequestBody DatasetDTO datasetDTO) {
        DatasetDTO updatedDataset = datasetService.updateDataset(id, datasetDTO);
        return ResponseEntity.ok(updatedDataset);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteDataset(@PathVariable Long id) {
        datasetService.deleteDataset(id);
        return ResponseEntity.noContent().build();
    }
}