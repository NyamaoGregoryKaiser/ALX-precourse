```java
package com.alx.eventmanagement.event.dto;

import com.alx.eventmanagement.category.dto.CategoryDTO;
import com.alx.eventmanagement.user.dto.UserDTO;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class EventDTO {
    private UUID id;
    private String title;
    private String description;
    private String location;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer totalCapacity;
    private Integer availableTickets;
    private UserDTO organizer;
    private CategoryDTO category;
    private List<TicketTypeDTO> ticketTypes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```