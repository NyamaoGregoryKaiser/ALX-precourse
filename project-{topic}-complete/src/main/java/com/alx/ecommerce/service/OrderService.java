package com.alx.ecommerce.service;

import com.alx.ecommerce.model.Order;
import com.alx.ecommerce.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.alx.ecommerce.exception.ResourceNotFoundException;
import com.alx.ecommerce.model.Product;
import com.alx.ecommerce.model.User;
import com.alx.ecommerce.model.OrderItem;
import com.alx.ecommerce.repository.ProductRepository;
import com.alx.ecommerce.repository.UserRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service for managing orders.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    /**
     * Creates a new order for a user.
     *
     * @param userId The ID of the user placing the order.
     * @param productQuantities A map of product ID to quantity for items in the order.
     * @param shippingAddress The shipping address for the order.
     * @return The created order.
     * @throws ResourceNotFoundException if user or any product is not found.
     * @throws IllegalArgumentException if product quantity is invalid or stock is insufficient.
     */
    @Transactional
    public Order createOrder(Long userId, Map<Long, Integer> productQuantities, String shippingAddress) {
        log.info("Creating order for user ID: {}", userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.warn("Order creation failed: User not found with ID: {}", userId);
                    return new ResourceNotFoundException("User", "id", userId);
                });

        if (productQuantities == null || productQuantities.isEmpty()) {
            throw new IllegalArgumentException("Order must contain at least one product.");
        }

        Order order = new Order();
        order.setUser(user);
        order.setStatus(Order.OrderStatus.PENDING);
        order.setShippingAddress(shippingAddress);
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (Map.Entry<Long, Integer> entry : productQuantities.entrySet()) {
            Long productId = entry.getKey();
            Integer quantity = entry.getValue();

            if (quantity <= 0) {
                throw new IllegalArgumentException("Quantity for product ID " + productId + " must be positive.");
            }

            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> {
                        log.warn("Order creation failed: Product not found with ID: {}", productId);
                        return new ResourceNotFoundException("Product", "id", productId);
                    });

            if (product.getStockQuantity() < quantity) {
                log.warn("Order creation failed: Insufficient stock for product ID {} (requested: {}, available: {}).", productId, quantity, product.getStockQuantity());
                throw new IllegalArgumentException("Insufficient stock for product: " + product.getName());
            }

            // Deduct stock
            product.setStockQuantity(product.getStockQuantity() - quantity);
            productRepository.save(product); // Save updated product stock

            OrderItem orderItem = OrderItem.builder()
                    .product(product)
                    .quantity(quantity)
                    .priceAtPurchase(product.getPrice()) // Record price at time of purchase
                    .order(order)
                    .build();

            order.addOrderItem(orderItem);
            totalAmount = totalAmount.add(product.getPrice().multiply(BigDecimal.valueOf(quantity)));
        }
        order.setTotalAmount(totalAmount);
        log.info("Order for user ID {} created successfully with total amount: {}", userId, totalAmount);
        return orderRepository.save(order);
    }

    /**
     * Retrieves an order by its ID.
     *
     * @param orderId The ID of the order.
     * @return The found order.
     * @throws ResourceNotFoundException if the order is not found.
     */
    public Order getOrderById(Long orderId) {
        log.debug("Fetching order by ID: {}", orderId);
        return orderRepository.findById(orderId)
                .orElseThrow(() -> {
                    log.warn("Order not found with ID: {}", orderId);
                    return new ResourceNotFoundException("Order", "id", orderId);
                });
    }

    /**
     * Retrieves all orders for a specific user.
     *
     * @param userId The ID of the user.
     * @return A list of orders for the user.
     */
    public List<Order> getOrdersByUserId(Long userId) {
        log.debug("Fetching orders for user ID: {}", userId);
        return orderRepository.findByUserId(userId);
    }

    /**
     * Retrieves all orders with pagination and sorting (for admin view).
     *
     * @param pageNo   Page number.
     * @param pageSize Page size.
     * @param sortBy   Field to sort by.
     * @param sortDir  Sort direction (asc/desc).
     * @return A page of orders.
     */
    public Page<Order> getAllOrders(int pageNo, int pageSize, String sortBy, String sortDir) {
        log.debug("Fetching all orders with pageNo: {}, pageSize: {}, sortBy: {}, sortDir: {}", pageNo, pageSize, sortBy, sortDir);
        Sort sort = sortDir.equalsIgnoreCase(Sort.Direction.ASC.name()) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(pageNo, pageSize, sort);
        return orderRepository.findAll(pageable);
    }

    /**
     * Updates the status of an order.
     *
     * @param orderId The ID of the order to update.
     * @param newStatus The new status for the order.
     * @return The updated order.
     * @throws ResourceNotFoundException if the order is not found.
     */
    @Transactional
    public Order updateOrderStatus(Long orderId, Order.OrderStatus newStatus) {
        Order order = getOrderById(orderId);
        log.info("Updating status for order ID {} from {} to {}", orderId, order.getStatus(), newStatus);
        order.setStatus(newStatus);
        return orderRepository.save(order);
    }

    /**
     * Deletes an order by its ID. (Typically, orders are not deleted, but cancelled/archived)
     *
     * @param orderId The ID of the order to delete.
     * @throws ResourceNotFoundException if the order is not found.
     */
    @Transactional
    public void deleteOrder(Long orderId) {
        Order order = getOrderById(orderId);
        log.warn("Deleting order with ID: {}. (Note: Orders are usually cancelled/archived, not deleted in production systems).", orderId);
        orderRepository.delete(order);
    }
}