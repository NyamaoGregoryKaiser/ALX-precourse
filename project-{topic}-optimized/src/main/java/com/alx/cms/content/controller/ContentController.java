```java
package com.alx.cms.content.controller;

import com.alx.cms.content.dto.ContentDTO;
import com.alx.cms.content.service.ContentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/contents")
@RequiredArgsConstructor
@Tag(name = "Content Management", description = "APIs for managing content (articles, pages, blog posts)")
@SecurityRequirement(name = "bearerAuth") // Indicates that this controller requires JWT authentication
public class ContentController {

    private final ContentService contentService;

    @Operation(summary = "Create new content", description = "Creates a new content item (article, page) in the CMS. Requires ADMIN or MODERATOR role.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Content created successfully",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ContentDTO.class))),
            @ApiResponse(responseCode = "400", description = "Invalid input data"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden: Insufficient role"),
            @ApiResponse(responseCode = "404", description = "Author or Category/Tag not found")
    })
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<ContentDTO> createContent(@Valid @RequestBody ContentDTO contentDTO) {
        ContentDTO createdContent = contentService.createContent(contentDTO);
        return new ResponseEntity<>(createdContent, HttpStatus.CREATED);
    }

    @Operation(summary = "Get content by ID", description = "Retrieves a single content item by its unique ID.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Content found",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ContentDTO.class))),
            @ApiResponse(responseCode = "404", description = "Content not found")
    })
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'MODERATOR', 'ADMIN')") // All authenticated users can view
    public ResponseEntity<ContentDTO> getContentById(@Parameter(description = "ID of the content to retrieve") @PathVariable Long id) {
        ContentDTO content = contentService.getContentById(id);
        return ResponseEntity.ok(content);
    }

    @Operation(summary = "Get content by slug", description = "Retrieves a single content item by its URL-friendly slug.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Content found",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ContentDTO.class))),
            @ApiResponse(responseCode = "404", description = "Content not found")
    })
    @GetMapping("/slug/{slug}")
    @PreAuthorize("hasAnyRole('USER', 'MODERATOR', 'ADMIN')")
    public ResponseEntity<ContentDTO> getContentBySlug(@Parameter(description = "Slug of the content to retrieve") @PathVariable String slug) {
        ContentDTO content = contentService.getContentBySlug(slug);
        return ResponseEntity.ok(content);
    }

    @Operation(summary = "Get all contents", description = "Retrieves a paginated list of all content items.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "List of contents retrieved",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = Page.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'MODERATOR', 'ADMIN')")
    public ResponseEntity<Page<ContentDTO>> getAllContents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String[] sort) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.fromString(sort[1]), sort[0]));
        Page<ContentDTO> contents = contentService.getAllContents(pageable);
        return ResponseEntity.ok(contents);
    }

    @Operation(summary = "Update content", description = "Updates an existing content item by its ID. Requires ADMIN or MODERATOR role.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Content updated successfully",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ContentDTO.class))),
            @ApiResponse(responseCode = "400", description = "Invalid input data"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden: Insufficient role"),
            @ApiResponse(responseCode = "404", description = "Content or related resources not found")
    })
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<ContentDTO> updateContent(
            @Parameter(description = "ID of the content to update") @PathVariable Long id,
            @Valid @RequestBody ContentDTO contentDTO) {
        ContentDTO updatedContent = contentService.updateContent(id, contentDTO);
        return ResponseEntity.ok(updatedContent);
    }

    @Operation(summary = "Delete content", description = "Deletes a content item by its ID. Requires ADMIN role.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Content deleted successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden: Insufficient role"),
            @ApiResponse(responseCode = "404", description = "Content not found")
    })
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteContent(@Parameter(description = "ID of the content to delete") @PathVariable Long id) {
        contentService.deleteContent(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Publish content", description = "Publishes a content item by its ID. Requires ADMIN or MODERATOR role.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Content published successfully",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ContentDTO.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden: Insufficient role"),
            @ApiResponse(responseCode = "404", description = "Content not found")
    })
    @PatchMapping("/{id}/publish")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<ContentDTO> publishContent(@Parameter(description = "ID of the content to publish") @PathVariable Long id) {
        ContentDTO publishedContent = contentService.publishContent(id);
        return ResponseEntity.ok(publishedContent);
    }

    @Operation(summary = "Unpublish content", description = "Unpublishes a content item by its ID. Requires ADMIN or MODERATOR role.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Content unpublished successfully",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ContentDTO.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden: Insufficient role"),
            @ApiResponse(responseCode = "404", description = "Content not found")
    })
    @PatchMapping("/{id}/unpublish")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<ContentDTO> unpublishContent(@Parameter(description = "ID of the content to unpublish") @PathVariable Long id) {
        ContentDTO unpublishedContent = contentService.unpublishContent(id);
        return ResponseEntity.ok(unpublishedContent);
    }
}
```