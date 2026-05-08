```java
package com.alx.eventmanagement.event.service;

import com.alx.eventmanagement.category.model.Category;
import com.alx.eventmanagement.category.service.CategoryService;
import com.alx.eventmanagement.common.exception.BadRequestException;
import com.alx.eventmanagement.common.exception.ResourceNotFoundException;
import com.alx.eventmanagement.event.dto.CreateEventDTO;
import com.alx.eventmanagement.event.dto.EventDTO;
import com.alx.eventmanagement.event.dto.TicketTypeDTO;
import com.alx.eventmanagement.event.dto.UpdateEventDTO;
import com.alx.eventmanagement.event.model.Event;
import com.alx.eventmanagement.event.model.TicketType;
import com.alx.eventmanagement.event.repository.EventRepository;
import com.alx.eventmanagement.event.repository.TicketTypeRepository;
import com.alx.eventmanagement.user.model.User;
import com.alx.eventmanagement.user.repository.UserRepository;
import com.alx.eventmanagement.util.MapperUtil;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventService {

    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final CategoryService categoryService;
    private final TicketTypeRepository ticketTypeRepository;

    @Cacheable(value = "popularEvents", key = "{#categoryId, #location, #pageable.pageNumber}")
    public Page<EventDTO> getEvents(Long categoryId, String location, Pageable pageable) {
        log.debug("Fetching events from DB with categoryId: {}, location: {}, pageable: {}", categoryId, location, pageable);
        LocalDateTime now = LocalDateTime.now();
        Page<Event> eventsPage;
        if (categoryId != null || location != null) {
            // This needs to be adjusted for Pageable if using a custom query like findUpcomingEvents
            // For simplicity, using findAll and filtering or using a repository method that supports Pageable
            eventsPage = eventRepository.findAll((root, query, cb) -> {
                Predicate p = cb.conjunction();
                if (categoryId != null) {
                    p = cb.and(p, cb.equal(root.get("category").get("id"), categoryId));
                }
                if (location != null && !location.isBlank()) {
                    p = cb.and(p, cb.like(cb.lower(root.get("location")), "%" + location.toLowerCase() + "%"));
                }
                p = cb.and(p, cb.greaterThanOrEqualTo(root.get("startTime"), now));
                return p;
            }, pageable);
        } else {
            // Default to upcoming events
            eventsPage = eventRepository.findAll((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("startTime"), now), pageable);
        }
        return eventsPage.map(MapperUtil::toEventDTO);
    }

    public EventDTO getEventById(UUID id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", id));
        return MapperUtil.toEventDTO(event);
    }

    @Transactional
    @RateLimiter(name = "eventCreationRateLimiter") // Apply rate limiting to event creation
    @CacheEvict(value = "popularEvents", allEntries = true) // Clear relevant cache
    public EventDTO createEvent(CreateEventDTO createEventDTO) {
        User currentUser = getCurrentAuthenticatedUser();
        // Check if current user has ORGANIZER or ADMIN role
        if (!currentUser.getRoles().stream().anyMatch(r -> r.getName() == UserRole.ROLE_ORGANIZER || r.getName() == UserRole.ROLE_ADMIN)) {
            throw new AccessDeniedException("Only organizers or administrators can create events.");
        }

        if (createEventDTO.getEndTime().isBefore(createEventDTO.getStartTime())) {
            throw new BadRequestException("Event end time cannot be before start time.");
        }

        Category category = categoryService.getCategoryEntityById(createEventDTO.getCategoryId());

        int totalTicketQuantity = createEventDTO.getTicketTypes().stream()
                .mapToInt(dto -> dto.getQuantity())
                .sum();

        if (totalTicketQuantity > createEventDTO.getTotalCapacity()) {
            throw new BadRequestException("Total quantity of tickets cannot exceed event's total capacity.");
        }

        Event event = Event.builder()
                .title(createEventDTO.getTitle())
                .description(createEventDTO.getDescription())
                .location(createEventDTO.getLocation())
                .startTime(createEventDTO.getStartTime())
                .endTime(createEventDTO.getEndTime())
                .totalCapacity(createEventDTO.getTotalCapacity())
                .availableTickets(totalTicketQuantity) // Initial available tickets = sum of all ticket type quantities
                .organizer(currentUser)
                .category(category)
                .build();

        List<TicketType> ticketTypes = createEventDTO.getTicketTypes().stream()
                .map(dto -> TicketType.builder()
                        .name(dto.getName())
                        .description(dto.getDescription())
                        .price(dto.getPrice())
                        .totalQuantity(dto.getQuantity())
                        .availableQuantity(dto.getQuantity())
                        .event(event) // Set event reference here
                        .build())
                .collect(Collectors.toList());

        event.setTicketTypes(ticketTypes); // Set the list of ticket types on the event

        log.info("Creating new event: {}", event.getTitle());
        Event savedEvent = eventRepository.save(event);
        return MapperUtil.toEventDTO(savedEvent);
    }

    @Transactional
    @CacheEvict(value = "popularEvents", allEntries = true)
    public EventDTO updateEvent(UUID id, UpdateEventDTO updateEventDTO) {
        Event existingEvent = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", id));

        User currentUser = getCurrentAuthenticatedUser();
        if (!existingEvent.getOrganizer().getId().equals(currentUser.getId()) &&
                !currentUser.getRoles().stream().anyMatch(r -> r.getName() == UserRole.ROLE_ADMIN)) {
            throw new AccessDeniedException("You are not authorized to update this event.");
        }

        if (updateEventDTO.getTitle() != null) existingEvent.setTitle(updateEventDTO.getTitle());
        if (updateEventDTO.getDescription() != null) existingEvent.setDescription(updateEventDTO.getDescription());
        if (updateEventDTO.getLocation() != null) existingEvent.setLocation(updateEventDTO.getLocation());
        if (updateEventDTO.getStartTime() != null) existingEvent.setStartTime(updateEventDTO.getStartTime());
        if (updateEventDTO.getEndTime() != null) existingEvent.setEndTime(updateEventDTO.getEndTime());
        if (updateEventDTO.getTotalCapacity() != null) {
            if (updateEventDTO.getTotalCapacity() < existingEvent.getAvailableTickets()) {
                throw new BadRequestException("New total capacity cannot be less than current available tickets.");
            }
            existingEvent.setTotalCapacity(updateEventDTO.getTotalCapacity());
        }
        if (updateEventDTO.getCategoryId() != null) {
            Category category = categoryService.getCategoryEntityById(updateEventDTO.getCategoryId());
            existingEvent.setCategory(category);
        }

        if (updateEventDTO.getEndTime() != null && existingEvent.getStartTime() != null &&
                updateEventDTO.getEndTime().isBefore(existingEvent.getStartTime())) {
            throw new BadRequestException("Event end time cannot be before start time.");
        }
        if (updateEventDTO.getStartTime() != null && existingEvent.getEndTime() != null &&
                updateEventDTO.getStartTime().isAfter(existingEvent.getEndTime())) {
            throw new BadRequestException("Event start time cannot be after end time.");
        }


        // Update existing ticket types
        if (updateEventDTO.getTicketTypes() != null && !updateEventDTO.getTicketTypes().isEmpty()) {
            updateEventDTO.getTicketTypes().forEach(updatedTicketDTO -> {
                TicketType ticketType = existingEvent.getTicketTypes().stream()
                        .filter(tt -> tt.getId().equals(updatedTicketDTO.getId()))
                        .findFirst()
                        .orElseThrow(() -> new ResourceNotFoundException("TicketType", "id", updatedTicketDTO.getId()));

                // Calculate change in quantity and update available tickets for event
                int quantityChange = updatedTicketDTO.getTotalQuantity() - ticketType.getTotalQuantity();
                ticketType.setTotalQuantity(updatedTicketDTO.getTotalQuantity());
                ticketType.setAvailableQuantity(ticketType.getAvailableQuantity() + quantityChange); // Adjust available based on new total

                if (ticketType.getAvailableQuantity() < 0) {
                    throw new BadRequestException("New ticket type total quantity results in negative available tickets.");
                }

                existingEvent.setAvailableTickets(existingEvent.getAvailableTickets() + quantityChange);

                if (existingEvent.getAvailableTickets() < 0) {
                    throw new BadRequestException("Event's total available tickets cannot be negative after ticket type update.");
                }
                if (existingEvent.getAvailableTickets() > existingEvent.getTotalCapacity()) {
                    throw new BadRequestException("Event's total available tickets cannot exceed event's total capacity.");
                }

                ticketType.setName(updatedTicketDTO.getName());
                ticketType.setDescription(updatedTicketDTO.getDescription());
                ticketType.setPrice(updatedTicketDTO.getPrice());
                ticketTypeRepository.save(ticketType); // Explicitly save updated ticket type
            });
        }

        // Add new ticket types
        if (updateEventDTO.getNewTicketTypes() != null && !updateEventDTO.getNewTicketTypes().isEmpty()) {
            updateEventDTO.getNewTicketTypes().forEach(newTicketDTO -> {
                TicketType newTicketType = TicketType.builder()
                        .name(newTicketDTO.getName())
                        .description(newTicketDTO.getDescription())
                        .price(newTicketDTO.getPrice())
                        .totalQuantity(newTicketDTO.getQuantity())
                        .availableQuantity(newTicketDTO.getQuantity())
                        .event(existingEvent)
                        .build();
                existingEvent.addTicketType(newTicketType);
                existingEvent.setAvailableTickets(existingEvent.getAvailableTickets() + newTicketDTO.getQuantity());
            });
        }

        // Validate total capacity after all updates
        int currentTotalTickets = existingEvent.getTicketTypes().stream().mapToInt(TicketType::getTotalQuantity).sum();
        if (currentTotalTickets > existingEvent.getTotalCapacity()) {
            throw new BadRequestException("Sum of ticket type quantities exceeds event's total capacity after update.");
        }

        log.info("Updating event with ID {}: {}", id, existingEvent.getTitle());
        Event updatedEvent = eventRepository.save(existingEvent);
        return MapperUtil.toEventDTO(updatedEvent);
    }

    @Transactional
    @CacheEvict(value = "popularEvents", allEntries = true)
    public void deleteEvent(UUID id) {
        Event existingEvent = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", id));

        User currentUser = getCurrentAuthenticatedUser();
        if (!existingEvent.getOrganizer().getId().equals(currentUser.getId()) &&
                !currentUser.getRoles().stream().anyMatch(r -> r.getName() == UserRole.ROLE_ADMIN)) {
            throw new AccessDeniedException("You are not authorized to delete this event.");
        }

        log.info("Deleting event with ID: {}", id);
        eventRepository.delete(existingEvent);
    }

    // Helper method to get the currently authenticated user
    private User getCurrentAuthenticatedUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetails) {
            String username = ((UserDetails) principal).getUsername();
            return userRepository.findByUsername(username)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));
        }
        throw new AccessDeniedException("User not authenticated.");
    }
}
```