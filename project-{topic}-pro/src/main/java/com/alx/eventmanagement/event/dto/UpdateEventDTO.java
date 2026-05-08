```java
package com.alx.eventmanagement.event.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class UpdateEventDTO {
    @Size(min = 3, max = 255, message = "Event title must be between 3 and 255 characters")
    private String title;

    private String description;

    @Size(min = 3, max = 255, message = "Event location must be between 3 and 255 characters")
    private String location;

    @FutureOrPresent(message = "Event start time must be in the present or future")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime startTime;

    @FutureOrPresent(message = "Event end time must be in the present or future")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime endTime;

    @Min(value = 1, message = "Total capacity must be at least 1")
    private Integer totalCapacity;

    private Long categoryId;

    private List<UpdateTicketTypeDTO> ticketTypes; // For updating existing ticket types

    private List<CreateTicketTypeDTO> newTicketTypes; // For adding new ticket types
}
```