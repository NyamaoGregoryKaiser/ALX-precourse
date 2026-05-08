```java
package com.alx.eventmanagement.service;

import com.alx.eventmanagement.category.model.Category;
import com.alx.eventmanagement.category.service.CategoryService;
import com.alx.eventmanagement.common.exception.BadRequestException;
import com.alx.eventmanagement.common.exception.ResourceNotFoundException;
import com.alx.eventmanagement.event.dto.CreateEventDTO;
import com.alx.eventmanagement.event.dto.CreateTicketTypeDTO;
import com.alx.eventmanagement.event.dto.EventDTO;
import com.alx.eventmanagement.event.dto.UpdateEventDTO;
import com.alx.eventmanagement.event.dto.UpdateTicketTypeDTO;
import com.alx.eventmanagement.event.model.Event;
import com.alx.eventmanagement.event.model.TicketType;
import com.alx.eventmanagement.event.repository.EventRepository;
import com.alx.eventmanagement.event.repository.TicketTypeRepository;
import com.alx.eventmanagement.event.service.EventService;
import com.alx.eventmanagement.user.model.Role;
import com.alx.eventmanagement.user.model.User;
import com.alx.eventmanagement.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EventServiceTest {

    @Mock
    private EventRepository eventRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CategoryService categoryService;

    @Mock
    private TicketTypeRepository ticketTypeRepository;

    @InjectMocks
    private EventService eventService;

    private User organizerUser;
    private User regularUser;
    private Category testCategory;
    private Event testEvent;
    private TicketType testTicketType;

    @BeforeEach
    void setUp() {
        Role organizerRole = new Role(2L, Role.RoleName.ROLE_ORGANIZER);
        Role userRole = new Role(1L, Role.RoleName.ROLE_USER);

        organizerUser = User.builder()
                .id(UUID.randomUUID())
                .username("organizer1")
                .email("organizer@example.com")
                .password("encoded_password")
                .roles(Set.of(organizerRole))
                .build();

        regularUser = User.builder()
                .id(UUID.randomUUID())
                .username("user1")
                .email("user@example.com")
                .password("encoded_password")
                .roles(Set.of(userRole))
                .build();

        testCategory = Category.builder()
                .id(1L)
                .name("Concert")
                .description("Live music")
                .build();

        testTicketType = TicketType.builder()
                .id(UUID.randomUUID())
                .name("General Admission")
                .price(BigDecimal.valueOf(50.00))
                .totalQuantity(100)
                .availableQuantity(100)
                .build();

        testEvent = Event.builder()
                .id(UUID.randomUUID())
                .title("Rock Festival")
                .description("Annual rock music festival")
                .location("Central Park")
                .startTime(LocalDateTime.now().plusDays(10))
                .endTime(LocalDateTime.now().plusDays(12))
                .totalCapacity(500)
                .availableTickets(100)
                .organizer(organizerUser)
                .category(testCategory)
                .ticketTypes(List.of(testTicketType))
                .build();
        testTicketType.setEvent(testEvent); // Link ticket type to event

        // Setup SecurityContextHolder for authenticated user
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(organizerUser, null, organizerUser.getAuthorities()));

        lenient().when(userRepository.findByUsername(organizerUser.getUsername())).thenReturn(Optional.of(organizerUser));
        lenient().when(userRepository.findByUsername(regularUser.getUsername())).thenReturn(Optional.of(regularUser));
    }

    @Test
    @DisplayName("Should create event successfully as organizer")
    void createEvent_asOrganizer_shouldSucceed() {
        CreateTicketTypeDTO createTicketTypeDTO = new CreateTicketTypeDTO();
        createTicketTypeDTO.setName("Early Bird");
        createTicketTypeDTO.setPrice(BigDecimal.valueOf(30.00));
        createTicketTypeDTO.setQuantity(50);

        CreateEventDTO createEventDTO = new CreateEventDTO();
        createEventDTO.setTitle("New Event");
        createEventDTO.setDescription("Test event description");
        createEventDTO.setLocation("Test Location");
        createEventDTO.setStartTime(LocalDateTime.now().plusDays(1));
        createEventDTO.setEndTime(LocalDateTime.now().plusDays(2));
        createEventDTO.setTotalCapacity(100);
        createEventDTO.setCategoryId(testCategory.getId());
        createEventDTO.setTicketTypes(List.of(createTicketTypeDTO));

        when(categoryService.getCategoryEntityById(testCategory.getId())).thenReturn(testCategory);
        when(eventRepository.save(any(Event.class))).thenAnswer(invocation -> {
            Event event = invocation.getArgument(0);
            event.setId(UUID.randomUUID()); // Simulate ID generation
            event.getTicketTypes().forEach(tt -> tt.setId(UUID.randomUUID())); // Simulate ticket type ID generation
            return event;
        });

        EventDTO result = eventService.createEvent(createEventDTO);

        assertNotNull(result);
        assertEquals("New Event", result.getTitle());
        assertEquals(organizerUser.getId(), result.getOrganizer().getId());
        assertEquals(50, result.getAvailableTickets()); // 50 tickets from Early Bird
        assertEquals(1, result.getTicketTypes().size());
        verify(eventRepository, times(1)).save(any(Event.class));
    }

    @Test
    @DisplayName("Should throw BadRequestException if end time is before start time")
    void createEvent_endTimeBeforeStartTime_shouldThrowBadRequestException() {
        CreateEventDTO createEventDTO = new CreateEventDTO();
        createEventDTO.setTitle("Bad Event");
        createEventDTO.setStartTime(LocalDateTime.now().plusDays(2));
        createEventDTO.setEndTime(LocalDateTime.now().plusDays(1)); // Invalid
        createEventDTO.setTotalCapacity(100);
        createEventDTO.setCategoryId(testCategory.getId());
        createEventDTO.setTicketTypes(List.of(new CreateTicketTypeDTO())); // Dummy ticket type

        assertThrows(BadRequestException.class, () -> eventService.createEvent(createEventDTO));
        verify(eventRepository, never()).save(any(Event.class));
    }

    @Test
    @DisplayName("Should throw BadRequestException if total ticket quantity exceeds event capacity")
    void createEvent_totalTicketQuantityExceedsCapacity_shouldThrowBadRequestException() {
        CreateTicketTypeDTO createTicketTypeDTO = new CreateTicketTypeDTO();
        createTicketTypeDTO.setQuantity(150); // More than event capacity

        CreateEventDTO createEventDTO = new CreateEventDTO();
        createEventDTO.setTitle("Over capacity");
        createEventDTO.setStartTime(LocalDateTime.now().plusDays(1));
        createEventDTO.setEndTime(LocalDateTime.now().plusDays(2));
        createEventDTO.setTotalCapacity(100); // Max capacity 100
        createEventDTO.setCategoryId(testCategory.getId());
        createEventDTO.setTicketTypes(List.of(createTicketTypeDTO));

        assertThrows(BadRequestException.class, () -> eventService.createEvent(createEventDTO));
        verify(eventRepository, never()).save(any(Event.class));
    }

    @Test
    @DisplayName("Should throw AccessDeniedException if regular user tries to create event")
    void createEvent_asRegularUser_shouldThrowAccessDeniedException() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(regularUser, null, regularUser.getAuthorities()));

        CreateEventDTO createEventDTO = new CreateEventDTO(); // Minimal valid DTO
        createEventDTO.setTitle("New Event");
        createEventDTO.setLocation("Location");
        createEventDTO.setStartTime(LocalDateTime.now().plusDays(1));
        createEventDTO.setEndTime(LocalDateTime.now().plusDays(2));
        createEventDTO.setTotalCapacity(100);
        createEventDTO.setCategoryId(testCategory.getId());
        createEventDTO.setTicketTypes(List.of(new CreateTicketTypeDTO("Standard", "desc", BigDecimal.valueOf(10), 50)));

        assertThrows(AccessDeniedException.class, () -> eventService.createEvent(createEventDTO));
        verify(eventRepository, never()).save(any(Event.class));
    }

    @Test
    @DisplayName("Should retrieve event by ID")
    void getEventById_shouldReturnEvent() {
        when(eventRepository.findById(testEvent.getId())).thenReturn(Optional.of(testEvent));

        EventDTO result = eventService.getEventById(testEvent.getId());

        assertNotNull(result);
        assertEquals(testEvent.getTitle(), result.getTitle());
        verify(eventRepository, times(1)).findById(testEvent.getId());
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException if event not found")
    void getEventById_notFound_shouldThrowResourceNotFoundException() {
        when(eventRepository.findById(any(UUID.class))).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> eventService.getEventById(UUID.randomUUID()));
        verify(eventRepository, times(1)).findById(any(UUID.class));
    }

    @Test
    @DisplayName("Should update event successfully as organizer")
    void updateEvent_asOrganizer_shouldSucceed() {
        UpdateEventDTO updateEventDTO = new UpdateEventDTO();
        updateEventDTO.setTitle("Updated Title");
        updateEventDTO.setTotalCapacity(600);
        updateEventDTO.setNewTicketTypes(List.of(new CreateTicketTypeDTO("VIP", "VIP tickets", BigDecimal.valueOf(100), 50)));

        when(eventRepository.findById(testEvent.getId())).thenReturn(Optional.of(testEvent));
        when(eventRepository.save(any(Event.class))).thenReturn(testEvent); // Mock save behavior

        EventDTO result = eventService.updateEvent(testEvent.getId(), updateEventDTO);

        assertNotNull(result);
        assertEquals("Updated Title", result.getTitle());
        assertEquals(600, result.getTotalCapacity());
        assertEquals(2, result.getTicketTypes().size()); // Original + new VIP
        assertEquals(150, result.getAvailableTickets()); // 100 (original) + 50 (new VIP)
        verify(eventRepository, times(1)).save(any(Event.class));
    }

    @Test
    @DisplayName("Should update existing ticket type quantity and adjust event available tickets")
    void updateEvent_updateExistingTicketType_shouldAdjustQuantities() {
        UUID existingTicketTypeId = testTicketType.getId();
        UpdateTicketTypeDTO updateTicketTypeDTO = new UpdateTicketTypeDTO();
        updateTicketTypeDTO.setId(existingTicketTypeId);
        updateTicketTypeDTO.setName("Standard Updated");
        updateTicketTypeDTO.setPrice(BigDecimal.valueOf(60.00));
        updateTicketTypeDTO.setTotalQuantity(120); // Increase from 100 to 120

        UpdateEventDTO updateEventDTO = new UpdateEventDTO();
        updateEventDTO.setTicketTypes(List.of(updateTicketTypeDTO));

        when(eventRepository.findById(testEvent.getId())).thenReturn(Optional.of(testEvent));
        when(ticketTypeRepository.save(any(TicketType.class))).thenAnswer(i -> i.getArgument(0)); // Simulate save
        when(eventRepository.save(any(Event.class))).thenReturn(testEvent);

        EventDTO result = eventService.updateEvent(testEvent.getId(), updateEventDTO);

        assertNotNull(result);
        assertEquals(120, result.getTicketTypes().get(0).getTotalQuantity());
        assertEquals(120, result.getAvailableTickets()); // Total available is now 120
        verify(ticketTypeRepository, times(1)).save(any(TicketType.class));
        verify(eventRepository, times(1)).save(any(Event.class));
    }

    @Test
    @DisplayName("Should throw AccessDeniedException if regular user tries to update another's event")
    void updateEvent_asRegularUser_shouldThrowAccessDeniedException() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(regularUser, null, regularUser.getAuthorities()));

        UpdateEventDTO updateEventDTO = new UpdateEventDTO();
        updateEventDTO.setTitle("Attempted Update");

        when(eventRepository.findById(testEvent.getId())).thenReturn(Optional.of(testEvent)); // Event owned by organizerUser

        assertThrows(AccessDeniedException.class, () -> eventService.updateEvent(testEvent.getId(), updateEventDTO));
        verify(eventRepository, never()).save(any(Event.class));
    }

    @Test
    @DisplayName("Should delete event successfully as organizer")
    void deleteEvent_asOrganizer_shouldSucceed() {
        when(eventRepository.findById(testEvent.getId())).thenReturn(Optional.of(testEvent));
        doNothing().when(eventRepository).delete(testEvent);

        assertDoesNotThrow(() -> eventService.deleteEvent(testEvent.getId()));
        verify(eventRepository, times(1)).delete(testEvent);
    }

    @Test
    @DisplayName("Should throw AccessDeniedException if regular user tries to delete another's event")
    void deleteEvent_asRegularUser_shouldThrowAccessDeniedException() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(regularUser, null, regularUser.getAuthorities()));

        when(eventRepository.findById(testEvent.getId())).thenReturn(Optional.of(testEvent));

        assertThrows(AccessDeniedException.class, () -> eventService.deleteEvent(testEvent.getId()));
        verify(eventRepository, never()).delete(any(Event.class));
    }
}
```