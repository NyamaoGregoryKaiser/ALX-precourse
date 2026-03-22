```java
package com.alx.ecommerce.controller;

import com.alx.ecommerce.dto.OrderDTOs;
import com.alx.ecommerce.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
@Tag(name = "Orders", description = "Customer order management operations")
@SecurityRequirement(name = "bearerAuth")
@Slf4j
public class OrderController {

    private final OrderService orderService;
    private final UserService userService; // To get user ID from UserDetails

    @Operation(summary = "Create a new order",
               description = "Creates a new order for the authenticated user with specified products.")
    @PostMapping
    public ResponseEntity<OrderDTOs.OrderResponse> createOrder(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody OrderDTOs.CreateOrderRequest request) {
        UUID userId = userService.getUserByUsername(userDetails.getUsername()).getId();
        log.info("Received request to create order for user ID: {}", userId);
        OrderDTOs.OrderResponse order = orderService.createOrder(userId, request);
        return new ResponseEntity<>(order, HttpStatus.CREATED);
    }

    @Operation(summary = "Get order by ID",
               description = "Retrieves details of a specific order by its ID. Accessible by ADMIN or the order owner.")
    @GetMapping("/{orderId}")
    public ResponseEntity<OrderDTOs.OrderResponse> getOrderById(
            @Parameter(description = "ID of the order to retrieve") @PathVariable UUID orderId) {
        log.debug("Received request to get order by ID: {}", orderId);
        OrderDTOs.OrderResponse order = orderService.getOrderById(orderId);
        return ResponseEntity.ok(order);
    }

    @Operation(summary = "Get all orders for the authenticated user",
               description = "Retrieves a list of all orders placed by the authenticated user.")
    @GetMapping("/my-orders")
    public ResponseEntity<List<OrderDTOs.OrderResponse>> getMyOrders(@AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = userService.getUserByUsername(userDetails.getUsername()).getId();
        log.debug("Received request to get all orders for authenticated user ID: {}", userId);
        List<OrderDTOs.OrderResponse> orders = orderService.getOrdersByUserId(userId);
        return ResponseEntity.ok(orders);
    }

    @Operation(summary = "Get all orders (Admin only)",
               description = "Retrieves a list of all orders in the system. Requires ADMIN role.")
    @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping
    public ResponseEntity<List<OrderDTOs.OrderResponse>> getAllOrders() {
        log.debug("Admin received request to get all orders.");
        List<OrderDTOs.OrderResponse> orders = orderService.getAllOrders();
        return ResponseEntity.ok(orders);
    }

    @Operation(summary = "Update order status (Admin only)",
               description = "Updates the status of a specific order. Requires ADMIN role.")
    @PreAuthorize("hasAuthority('ADMIN')")
    @PatchMapping("/{orderId}/status")
    public ResponseEntity<OrderDTOs.OrderResponse> updateOrderStatus(
            @Parameter(description = "ID of the order to update") @PathVariable UUID orderId,
            @Valid @RequestBody OrderDTOs.UpdateOrderStatusRequest request) {
        log.info("Admin received request to update status for order ID: {} to {}", orderId, request.getStatus());
        OrderDTOs.OrderResponse updatedOrder = orderService.updateOrderStatus(orderId, request);
        return ResponseEntity.ok(updatedOrder);
    }

    @Operation(summary = "Delete an order (Admin only, or owner of PENDING/CANCELLED order)",
               description = "Deletes an order. Requires ADMIN role, or the order owner if the order is PENDING or CANCELLED.")
    @DeleteMapping("/{orderId}")
    public ResponseEntity<Void> deleteOrder(
            @Parameter(description = "ID of the order to delete") @PathVariable UUID orderId) {
        log.info("Received request to delete order with ID: {}", orderId);
        orderService.deleteOrder(orderId);
        return ResponseEntity.noContent().build();
    }
}
```