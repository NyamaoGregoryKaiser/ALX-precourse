package com.alx.ecommerce.controller;

import com.alx.ecommerce.dto.MessageResponse;
import com.alx.ecommerce.model.Order;
import com.alx.ecommerce.service.OrderService;
import com.alx.ecommerce.util.AppConstants;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import static com.alx.ecommerce.util.AppConstants.API_V1_BASE_URL;

/**
 * REST controller for managing orders.
 */
@Tag(name = "Order Management", description = "APIs for creating, retrieving, and managing user orders.")
@RestController
@RequestMapping(API_V1_BASE_URL + "/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final UserService userService; // To get current user ID

    /**
     * Creates a new order for the authenticated user.
     * Requires USER or ADMIN role.
     *
     * @param orderRequestMap A map of product ID to quantity, and a "shippingAddress" string.
     * @return ResponseEntity with the created order and HTTP status CREATED.
     */
    @Operation(summary = "Create a new order",
            description = "Creates a new order for the authenticated user. Requires USER or ADMIN role.",
            responses = {
                    @ApiResponse(responseCode = "201", description = "Order created successfully", content = @io.swagger.v3.oas.annotations.media.Content(mediaType = "application/json", schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = Order.class))),
                    @ApiResponse(responseCode = "400", description = "Bad Request (e.g., invalid quantities, insufficient stock, invalid address)"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized"),
                    @ApiResponse(responseCode = "404", description = "Product not found")
            },
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @PostMapping
    public ResponseEntity<Order> createOrder(@RequestBody Map<String, Object> orderRequestMap) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = authentication.getName();
        Long userId = userService.getUserById(userService.userRepository.findByUsernameOrEmail(currentUsername, currentUsername).orElseThrow().getId()).getId();

        @SuppressWarnings("unchecked")
        Map<Long, Integer> productQuantities = (Map<Long, Integer>) orderRequestMap.get("productQuantities");
        String shippingAddress = (String) orderRequestMap.get("shippingAddress");

        Order createdOrder = orderService.createOrder(userId, productQuantities, shippingAddress);
        return new ResponseEntity<>(createdOrder, HttpStatus.CREATED);
    }

    /**
     * Retrieves an order by its ID.
     * Requires ADMIN role or the user accessing their own order.
     *
     * @param id The ID of the order.
     * @return ResponseEntity with the order and HTTP status OK.
     */
    @Operation(summary = "Get order by ID",
            description = "Retrieves a single order by its unique identifier. Requires ADMIN role or user accessing their own order.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Order retrieved successfully"),
                    @ApiResponse(responseCode = "404", description = "Order not found"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized"),
                    @ApiResponse(responseCode = "403", description = "Forbidden (attempting to access another user's order without ADMIN role)")
            },
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @PreAuthorize("hasRole('ADMIN') or @securityService.isOrderOwner(#id)") // Custom security service to check ownership
    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrderById(@PathVariable Long id) {
        Order order = orderService.getOrderById(id);
        return new ResponseEntity<>(order, HttpStatus.OK);
    }

    /**
     * Retrieves all orders for the authenticated user.
     * Requires USER or ADMIN role.
     *
     * @return ResponseEntity with a list of orders and HTTP status OK.
     */
    @Operation(summary = "Get current user's orders",
            description = "Retrieves all orders placed by the authenticated user. Requires USER or ADMIN role.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Successfully retrieved orders"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized")
            },
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @GetMapping("/my-orders")
    public ResponseEntity<List<Order>> getMyOrders() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = authentication.getName();
        Long userId = userService.userRepository.findByUsernameOrEmail(currentUsername, currentUsername).orElseThrow().getId();
        List<Order> orders = orderService.getOrdersByUserId(userId);
        return new ResponseEntity<>(orders, HttpStatus.OK);
    }

    /**
     * Retrieves all orders with pagination and sorting (Admin only).
     * Requires ADMIN role.
     *
     * @param pageNo   Page number (default 0).
     * @param pageSize Page size (default 10).
     * @param sortBy   Field to sort by (default "orderDate").
     * @param sortDir  Sort direction (default "desc").
     * @return ResponseEntity with a page of orders and HTTP status OK.
     */
    @Operation(summary = "Get all orders (Admin only)",
            description = "Retrieves a paginated and sorted list of all orders in the system. Requires ADMIN role.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Successfully retrieved orders"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized"),
                    @ApiResponse(responseCode = "403", description = "Forbidden (missing ADMIN role)")
            },
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<Page<Order>> getAllOrders(
            @RequestParam(value = "pageNo", defaultValue = AppConstants.DEFAULT_PAGE_NUMBER, required = false) int pageNo,
            @RequestParam(value = "pageSize", defaultValue = AppConstants.DEFAULT_PAGE_SIZE, required = false) int pageSize,
            @RequestParam(value = "sortBy", defaultValue = "orderDate", required = false) String sortBy,
            @RequestParam(value = "sortDir", defaultValue = AppConstants.DEFAULT_SORT_DIRECTION, required = false) String sortDir
    ) {
        Page<Order> orders = orderService.getAllOrders(pageNo, pageSize, sortBy, sortDir);
        return new ResponseEntity<>(orders, HttpStatus.OK);
    }

    /**
     * Updates the status of an order.
     * Requires ADMIN role.
     *
     * @param id        The ID of the order to update.
     * @param newStatus The new status for the order.
     * @return ResponseEntity with the updated order and HTTP status OK.
     */
    @Operation(summary = "Update order status (Admin only)",
            description = "Updates the status of an existing order. Requires ADMIN role.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Order status updated successfully"),
                    @ApiResponse(responseCode = "400", description = "Bad Request (e.g., invalid status)"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized"),
                    @ApiResponse(responseCode = "403", description = "Forbidden (missing ADMIN role)"),
                    @ApiResponse(responseCode = "404", description = "Order not found")
            },
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}/status")
    public ResponseEntity<Order> updateOrderStatus(@PathVariable Long id, @RequestParam Order.OrderStatus newStatus) {
        Order updatedOrder = orderService.updateOrderStatus(id, newStatus);
        return new ResponseEntity<>(updatedOrder, HttpStatus.OK);
    }

    /**
     * Deletes an order by its ID.
     * Requires ADMIN role. (Note: In real systems, orders are usually cancelled/archived rather than deleted).
     *
     * @param id The ID of the order to delete.
     * @return ResponseEntity with a success message and HTTP status NO_CONTENT.
     */
    @Operation(summary = "Delete an order (Admin only)",
            description = "Deletes an order by its ID. (Caution: Orders are usually cancelled/archived in production, not deleted). Requires ADMIN role.",
            responses = {
                    @ApiResponse(responseCode = "204", description = "Order deleted successfully"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized"),
                    @ApiResponse(responseCode = "403", description = "Forbidden (missing ADMIN role)"),
                    @ApiResponse(responseCode = "404", description = "Order not found")
            },
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> deleteOrder(@PathVariable Long id) {
        orderService.deleteOrder(id);
        return new ResponseEntity<>(new MessageResponse("Order deleted successfully", HttpStatus.NO_CONTENT.value()), HttpStatus.NO_CONTENT);
    }
}