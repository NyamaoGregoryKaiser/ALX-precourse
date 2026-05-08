```java
package com.alx.eventmanagement.event.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class UpdateTicketTypeDTO {
    @NotNull(message = "Ticket type ID cannot be null for update")
    private UUID id;

    @NotBlank(message = "Ticket type name cannot be empty")
    private String name;

    private String description;

    @NotNull(message = "Ticket price cannot be null")
    @Min(value = 0, message = "Ticket price cannot be negative")
    private BigDecimal price;

    @NotNull(message = "Ticket quantity cannot be null")
    @Min(value = 0, message = "Ticket quantity cannot be negative")
    private Integer totalQuantity;
}
```