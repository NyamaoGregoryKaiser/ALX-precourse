package com.ml_utilities_system.controller;

import com.ml_utilities_system.dto.ModelDTO;
import com.ml_utilities_system.service.ModelService;
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
@RequestMapping("/api/models")
public class ModelController {

    @Autowired
    private ModelService modelService;

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'MODERATOR', 'ADMIN')")
    @RateLimited(key = "getModelById", limit = 10, durationSeconds = 60)
    public ResponseEntity<ModelDTO> getModelById(@PathVariable Long id) {
        ModelDTO model = modelService.getModelById(id);
        return ResponseEntity.ok(model);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'MODERATOR', 'ADMIN')")
    @RateLimited(key = "getAllModels", limit = 30, durationSeconds = 60)
    public ResponseEntity<Page<ModelDTO>> getAllModels(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id,asc") String[] sort) {
        Sort.Direction direction = Sort.Direction.fromString(sort[1]);
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sort[0]));
        Page<ModelDTO> models = modelService.getAllModels(pageable);
        return ResponseEntity.ok(models);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
    public ResponseEntity<ModelDTO> createModel(@Valid @RequestBody ModelDTO modelDTO) {
        ModelDTO createdModel = modelService.createModel(modelDTO);
        return new ResponseEntity<>(createdModel, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
    public ResponseEntity<ModelDTO> updateModel(@PathVariable Long id, @Valid @RequestBody ModelDTO modelDTO) {
        ModelDTO updatedModel = modelService.updateModel(id, modelDTO);
        return ResponseEntity.ok(updatedModel);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteModel(@PathVariable Long id) {
        modelService.deleteModel(id);
        return ResponseEntity.noContent().build();
    }
}