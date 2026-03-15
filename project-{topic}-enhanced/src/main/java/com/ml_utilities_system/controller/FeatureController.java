package com.ml_utilities_system.controller;

import com.ml_utilities_system.dto.FeatureDTO;
import com.ml_utilities_system.service.FeatureService;
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
@RequestMapping("/api/features")
public class FeatureController {

    @Autowired
    private FeatureService featureService;

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'MODERATOR', 'ADMIN')")
    @RateLimited(key = "getFeatureById", limit = 10, durationSeconds = 60)
    public ResponseEntity<FeatureDTO> getFeatureById(@PathVariable Long id) {
        FeatureDTO feature = featureService.getFeatureById(id);
        return ResponseEntity.ok(feature);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'MODERATOR', 'ADMIN')")
    @RateLimited(key = "getAllFeatures", limit = 30, durationSeconds = 60)
    public ResponseEntity<Page<FeatureDTO>> getAllFeatures(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id,asc") String[] sort) {
        Sort.Direction direction = Sort.Direction.fromString(sort[1]);
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sort[0]));
        Page<FeatureDTO> features = featureService.getAllFeatures(pageable);
        return ResponseEntity.ok(features);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
    public ResponseEntity<FeatureDTO> createFeature(@Valid @RequestBody FeatureDTO featureDTO) {
        FeatureDTO createdFeature = featureService.createFeature(featureDTO);
        return new ResponseEntity<>(createdFeature, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
    public ResponseEntity<FeatureDTO> updateFeature(@PathVariable Long id, @Valid @RequestBody FeatureDTO featureDTO) {
        FeatureDTO updatedFeature = featureService.updateFeature(id, featureDTO);
        return ResponseEntity.ok(updatedFeature);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteFeature(@PathVariable Long id) {
        featureService.deleteFeature(id);
        return ResponseEntity.noContent().build();
    }
}