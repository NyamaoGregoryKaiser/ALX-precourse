```java
package com.alx.eventmanagement.order.controller;

import com.alx.eventmanagement.order.dto.CreateOrderDTO;
import com.alx.eventmanagement.order.dto.OrderDTO;
import com.alx.eventmanagement.order.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Orders", description = "API for managing ticket orders")
public class OrderController {

    private final OrderService orderService;

    @Operation(summary = "Create a new order", description = "Users can create an order for one or more ticket types.")
    @PreAuthorize("hasRole('USER')")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping
    public ResponseEntity<OrderDTO> createOrder(@Valid @RequestBody CreateOrderDTO createOrderDTO) {
        log.info("Request to create new order.");
        OrderDTO newOrder = orderService.createOrder(createOrderDTO);
        return new ResponseEntity<>(newOrder, HttpStatus.CREATED);
    }

    @Operation(summary = "Get order by ID", description = "Retrieves a single order by its ID. Users can only view their own orders.")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/{id}")
    public ResponseEntity<OrderDTO> getOrderById(@PathVariable UUID id) {
        log.info("Request to get order by ID: {}", id);
        OrderDTO order = orderService.getOrderById(id);
        return ResponseEntity.ok(order);
    }

    @Operation(summary = "Get current user's orders", description = "Retrieves a list of all orders made by the authenticated user.")
    @PreAuthorize("hasRole('USER')")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/my-orders")
    public ResponseEntity<List<OrderDTO>> getUserOrders() {
        log.info("Request to get current user's orders.");
        List<OrderDTO> orders = orderService.getUserOrders();
        return ResponseEntity.ok(orders);
    }
}
```