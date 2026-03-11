package com.alx.ecommerce.order.controller;

import com.alx.ecommerce.common.ApiResponse;
import com.alx.ecommerce.order.dto.OrderDTO;
import com.alx.ecommerce.order.service.OrderService;
import com.alx.ecommerce.user.service.CustomUserDetailsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Tag(name = "Orders", description = "API for managing user orders and order processing")
@SecurityRequirement(name = "bearerAuth")
public class OrderController {

    private final OrderService orderService;
    private final CustomUserDetailsService userDetailsService;

    private Long getUserIdFromPrincipal(UserDetails userDetails) {
        return userDetailsService.loadUserByUsername(userDetails.getUsername()).getId();
    }

    @PostMapping
    @Operation(summary = "Place a new order", description = "Places an order for the authenticated user based on their current cart contents.")
    public ResponseEntity<ApiResponse<OrderDTO>> placeOrder(@AuthenticationPrincipal UserDetails userDetails,
                                                            @Valid @RequestBody Map<String, String> requestBody) {
        Long userId = getUserIdFromPrincipal(userDetails);
        String shippingAddress = requestBody.get("shippingAddress");
        OrderDTO order = orderService.placeOrder(userId, shippingAddress);
        return new ResponseEntity<>(new ApiResponse<>(true, "Order placed successfully", order), HttpStatus.CREATED);
    }

    @GetMapping("/my-orders")
    @Operation(summary = "Get current user's orders", description = "Retrieves a list of all orders placed by the authenticated user.")
    public ResponseEntity<ApiResponse<List<OrderDTO>>> getUserOrders(@AuthenticationPrincipal UserDetails userDetails) {
        Long userId = getUserIdFromPrincipal(userDetails);
        List<OrderDTO> orders = orderService.getUserOrders(userId);
        return new ResponseEntity<>(new ApiResponse<>(true, "User orders fetched successfully", orders), HttpStatus.OK);
    }

    @GetMapping("/{orderId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER') and @orderController.isOrderOwnerOrAdmin(#orderId, authentication.principal.username)")
    @Operation(summary = "Get order details by ID", description = "Retrieves details of a specific order by its ID. Accessible by order owner or ADMIN.")
    public ResponseEntity<ApiResponse<OrderDTO>> getOrderById(@AuthenticationPrincipal UserDetails userDetails, @PathVariable Long orderId) {
        // The PreAuthorize annotation handles the access check
        OrderDTO order = orderService.getOrderById(orderId);
        return new ResponseEntity<>(new ApiResponse<>(true, "Order details fetched successfully", order), HttpStatus.OK);
    }

    // Helper method for @PreAuthorize to check if the user is the order owner or admin
    public boolean isOrderOwnerOrAdmin(Long orderId, String username) {
        OrderDTO order = orderService.getOrderById(orderId);
        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        return order.getUserId().equals(userDetails.getId()) || userDetails.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    @PutMapping("/{orderId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update order status", description = "Updates the status of an order. Requires ADMIN role.")
    public ResponseEntity<ApiResponse<OrderDTO>> updateOrderStatus(@PathVariable Long orderId, @Valid @RequestBody Map<String, String> requestBody) {
        String newStatus = requestBody.get("status");
        OrderDTO updatedOrder = orderService.updateOrderStatus(orderId, newStatus);
        return new ResponseEntity<>(new ApiResponse<>(true, "Order status updated successfully", updatedOrder), HttpStatus.OK);
    }
}