```java
package com.alx.eventmanagement.event.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.Valid;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class CreateEventDTO {
    @NotBlank(message = "Event title cannot be empty")
    private String title;

    private String description;

    @NotBlank(message = "Event location cannot be empty")
    private String location;

    @NotNull(message = "Event start time cannot be null")
    @FutureOrPresent(message = "Event start time must be in the present or future")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime startTime;

    @NotNull(message = "Event end time cannot be null")
    @FutureOrPresent(message = "Event end time must be in the present or future")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime endTime;

    @NotNull(message = "Total capacity cannot be null")
    @Min(value = 1, message = "Total capacity must be at least 1")
    private Integer totalCapacity;

    @NotNull(message = "Category ID cannot be null")
    private Long categoryId;

    @Valid
    @NotNull(message = "At least one ticket type must be provided")
    private List<CreateTicketTypeDTO> ticketTypes;
}
```