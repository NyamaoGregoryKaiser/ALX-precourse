```java
package com.alx.eventmanagement.order.service;

import com.alx.eventmanagement.common.exception.BadRequestException;
import com.alx.eventmanagement.common.exception.ResourceNotFoundException;
import com.alx.eventmanagement.event.model.Event;
import com.alx.eventmanagement.event.model.TicketType;
import com.alx.eventmanagement.event.repository.EventRepository;
import com.alx.eventmanagement.event.repository.TicketTypeRepository;
import com.alx.eventmanagement.order.dto.CreateOrderDTO;
import com.alx.eventmanagement.order.dto.OrderDTO;
import com.alx.eventmanagement.order.dto.OrderItemRequestDTO;
import com.alx.eventmanagement.order.model.Order;
import com.alx.eventmanagement.order.model.OrderItem;
import com.alx.eventmanagement.order.repository.OrderRepository;
import com.alx.eventmanagement.user.model.User;
import com.alx.eventmanagement.user.repository.UserRepository;
import com.alx.eventmanagement.util.MapperUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final EventRepository eventRepository;

    @Transactional
    public OrderDTO createOrder(CreateOrderDTO createOrderDTO) {
        User currentUser = getCurrentAuthenticatedUser();

        if (createOrderDTO.getItems() == null || createOrderDTO.getItems().isEmpty()) {
            throw new BadRequestException("Order must contain at least one item.");
        }

        Order order = Order.builder()
                .user(currentUser)
                .orderDate(LocalDateTime.now())
                .status(Order.OrderStatus.PENDING) // Initial status
                .totalAmount(BigDecimal.ZERO)
                .build();

        BigDecimal totalOrderAmount = BigDecimal.ZERO;

        // Group order items by event to prevent concurrent modification issues for the same event
        Map<UUID, List<OrderItemRequestDTO>> itemsByEvent = createOrderDTO.getItems().stream()
                .collect(Collectors.groupingBy(item -> {
                    TicketType ticketType = ticketTypeRepository.findById(item.getTicketTypeId())
                            .orElseThrow(() -> new ResourceNotFoundException("TicketType", "id", item.getTicketTypeId()));
                    return ticketType.getEvent().getId();
                }));

        for (Map.Entry<UUID, List<OrderItemRequestDTO>> entry : itemsByEvent.entrySet()) {
            UUID eventId = entry.getKey();
            List<OrderItemRequestDTO> eventItems = entry.getValue();

            Event event = eventRepository.findById(eventId)
                    .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId));

            // Perform checks and updates for each event
            for (OrderItemRequestDTO itemRequest : eventItems) {
                TicketType ticketType = ticketTypeRepository.findById(itemRequest.getTicketTypeId())
                        .orElseThrow(() -> new ResourceNotFoundException("TicketType", "id", itemRequest.getTicketTypeId()));

                if (!ticketType.getEvent().getId().equals(event.getId())) {
                    throw new BadRequestException("Ticket type " + ticketType.getId() + " does not belong to event " + event.getId());
                }
                if (itemRequest.getQuantity() <= 0) {
                    throw new BadRequestException("Quantity for ticket type " + itemRequest.getTicketTypeId() + " must be positive.");
                }
                if (ticketType.getAvailableQuantity() < itemRequest.getQuantity()) {
                    throw new BadRequestException("Not enough tickets available for " + ticketType.getName() +
                            ". Available: " + ticketType.getAvailableQuantity() + ", Requested: " + itemRequest.getQuantity());
                }
                if (event.getAvailableTickets() < itemRequest.getQuantity()) {
                    throw new BadRequestException("Not enough total tickets available for event " + event.getTitle() +
                            ". Available: " + event.getAvailableTickets() + ", Requested: " + itemRequest.getQuantity());
                }
                if (event.getEndTime().isBefore(LocalDateTime.now())) {
                    throw new BadRequestException("Cannot purchase tickets for an event that has already ended.");
                }

                // Deduct tickets
                ticketType.setAvailableQuantity(ticketType.getAvailableQuantity() - itemRequest.getQuantity());
                event.setAvailableTickets(event.getAvailableTickets() - itemRequest.getQuantity());

                OrderItem orderItem = OrderItem.builder()
                        .order(order)
                        .ticketType(ticketType)
                        .quantity(itemRequest.getQuantity())
                        .unitPrice(ticketType.getPrice())
                        .build();
                order.addOrderItem(orderItem);

                totalOrderAmount = totalOrderAmount.add(ticketType.getPrice().multiply(BigDecimal.valueOf(itemRequest.getQuantity())));

                // Save changes to ticketType and event
                ticketTypeRepository.save(ticketType);
                eventRepository.save(event);
            }
        }

        order.setTotalAmount(totalOrderAmount);
        order.setStatus(Order.OrderStatus.CONFIRMED); // Assuming immediate confirmation for simplicity
        log.info("Creating new order for user {}. Total amount: {}", currentUser.getUsername(), totalOrderAmount);
        Order savedOrder = orderRepository.save(order);
        return MapperUtil.toOrderDTO(savedOrder);
    }

    public OrderDTO getOrderById(UUID id) {
        User currentUser = getCurrentAuthenticatedUser();
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", id));

        // Only allow user to see their own orders, or admin
        if (!order.getUser().getId().equals(currentUser.getId()) &&
                !currentUser.getRoles().stream().anyMatch(r -> r.getName() == User.RoleName.ROLE_ADMIN)) {
            throw new AccessDeniedException("You are not authorized to view this order.");
        }
        return MapperUtil.toOrderDTO(order);
    }

    public List<OrderDTO> getUserOrders() {
        User currentUser = getCurrentAuthenticatedUser();
        List<Order> orders = orderRepository.findByUserId(currentUser.getId());
        return orders.stream()
                .map(MapperUtil::toOrderDTO)
                .collect(Collectors.toList());
    }

    // Helper method to get the currently authenticated user
    private User getCurrentAuthenticatedUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetails) {
            String username = ((UserDetails) principal).getUsername();
            return userRepository.findByUsername(username)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));
        }
        throw new AccessDeniedException("User not authenticated.");
    }
}
```