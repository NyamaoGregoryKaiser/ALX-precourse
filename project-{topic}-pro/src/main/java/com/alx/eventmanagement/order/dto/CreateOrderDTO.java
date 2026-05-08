```java
package com.alx.eventmanagement.order.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class CreateOrderDTO {
    @NotEmpty(message = "Order must contain at least one item")
    @Valid
    private List<OrderItemRequestDTO> items;
}
```