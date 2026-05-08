```java
package com.alx.eventmanagement.event.controller;

import com.alx.eventmanagement.event.dto.CreateEventDTO;
import com.alx.eventmanagement.event.dto.EventDTO;
import com.alx.eventmanagement.event.dto.UpdateEventDTO;
import com.alx.eventmanagement.event.service.EventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Events", description = "API for managing event details and listings")
public class EventController {

    private final EventService eventService;

    @Operation(summary = "Get all events with optional filtering and pagination",
            description = "Retrieves a paginated list of events. Can filter by category and location. Results are cached.")
    @GetMapping
    public ResponseEntity<Page<EventDTO>> getEvents(
            @Parameter(description = "Filter by category ID") @RequestParam(required = false) Long categoryId,
            @Parameter(description = "Filter by event location (partial match)") @RequestParam(required = false) String location,
            @PageableDefault(size = 10, sort = "startTime", direction = Sort.Direction.ASC) Pageable pageable) {
        log.info("Request to get events with categoryId: {}, location: {}, pageable: {}", categoryId, location, pageable);
        Page<EventDTO> events = eventService.getEvents(categoryId, location, pageable);
        return ResponseEntity.ok(events);
    }

    @Operation(summary = "Get event by ID", description = "Retrieves a single event by its unique ID.")
    @GetMapping("/{id}")
    public ResponseEntity<EventDTO> getEventById(@PathVariable UUID id) {
        log.info("Request to get event by ID: {}", id);
        EventDTO event = eventService.getEventById(id);
        return ResponseEntity.ok(event);
    }

    @Operation(summary = "Create a new event", description = "Requires ORGANIZER or ADMIN role. Subject to rate limiting.")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping
    public ResponseEntity<EventDTO> createEvent(@Valid @RequestBody CreateEventDTO createEventDTO) {
        log.info("Request to create new event: {}", createEventDTO.getTitle());
        EventDTO newEvent = eventService.createEvent(createEventDTO);
        return new ResponseEntity<>(newEvent, HttpStatus.CREATED);
    }

    @Operation(summary = "Update an existing event", description = "Requires ORGANIZER role (for their own events) or ADMIN role.")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @PutMapping("/{id}")
    public ResponseEntity<EventDTO> updateEvent(@PathVariable UUID id, @Valid @RequestBody UpdateEventDTO updateEventDTO) {
        log.info("Request to update event with ID: {}", id);
        EventDTO updatedEvent = eventService.updateEvent(id, updateEventDTO);
        return ResponseEntity.ok(updatedEvent);
    }

    @Operation(summary = "Delete an event", description = "Requires ORGANIZER role (for their own events) or ADMIN role.")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable UUID id) {
        log.info("Request to delete event with ID: {}", id);
        eventService.deleteEvent(id);
        return ResponseEntity.noContent().build();
    }
}
```