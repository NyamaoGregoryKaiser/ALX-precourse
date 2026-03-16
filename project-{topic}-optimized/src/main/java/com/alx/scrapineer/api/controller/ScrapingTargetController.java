```java
package com.alx.scrapineer.api.controller;

import com.alx.scrapineer.api.dto.scraping.ScrapingTargetDto;
import com.alx.scrapineer.api.dto.scraping.ScrapingTargetMapping;
import com.alx.scrapineer.data.entity.User;
import com.alx.scrapineer.service.ScrapingTargetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/targets")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth") // Indicates that this endpoint requires JWT authentication
@Tag(name = "Scraping Targets", description = "Manage web scraping targets and their CSS selectors")
public class ScrapingTargetController {

    private final ScrapingTargetService targetService;
    private final ScrapingTargetMapping targetMapping;

    @Operation(summary = "Get all scraping targets for the authenticated user")
    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<ScrapingTargetDto>> getAllTargets(@AuthenticationPrincipal User currentUser) {
        List<ScrapingTargetDto> targets = targetService.getAllTargets(currentUser);
        return ResponseEntity.ok(targets);
    }

    @Operation(summary = "Get a scraping target by ID for the authenticated user")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ScrapingTargetDto> getTargetById(
            @Parameter(description = "ID of the target to retrieve", required = true) @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        ScrapingTargetDto target = targetService.getTargetById(id, currentUser);
        return ResponseEntity.ok(target);
    }

    @Operation(summary = "Create a new scraping target")
    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ScrapingTargetDto> createTarget(
            @Valid @RequestBody ScrapingTargetDto targetDto,
            @AuthenticationPrincipal User currentUser) {
        ScrapingTargetDto createdTarget = targetService.createTarget(targetDto, currentUser);
        return new ResponseEntity<>(createdTarget, HttpStatus.CREATED);
    }

    @Operation(summary = "Update an existing scraping target")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ScrapingTargetDto> updateTarget(
            @Parameter(description = "ID of the target to update", required = true) @PathVariable Long id,
            @Valid @RequestBody ScrapingTargetDto targetDto,
            @AuthenticationPrincipal User currentUser) {
        ScrapingTargetDto updatedTarget = targetService.updateTarget(id, targetDto, currentUser);
        return ResponseEntity.ok(updatedTarget);
    }

    @Operation(summary = "Delete a scraping target")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<Void> deleteTarget(
            @Parameter(description = "ID of the target to delete", required = true) @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        targetService.deleteTarget(id, currentUser);
        return ResponseEntity.noContent().build();
    }
}
```