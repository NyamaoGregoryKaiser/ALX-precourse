```java
package com.alx.eventmanagement.util;

import com.alx.eventmanagement.category.dto.CategoryDTO;
import com.alx.eventmanagement.category.model.Category;
import com.alx.eventmanagement.event.dto.EventDTO;
import com.alx.eventmanagement.event.dto.TicketTypeDTO;
import com.alx.eventmanagement.event.model.Event;
import com.alx.eventmanagement.event.model.TicketType;
import com.alx.eventmanagement.order.dto.OrderDTO;
import com.alx.eventmanagement.order.dto.OrderItemDTO;
import com.alx.eventmanagement.order.model.Order;
import com.alx.eventmanagement.order.model.OrderItem;
import com.alx.eventmanagement.user.dto.UserDTO;
import com.alx.eventmanagement.user.model.User;

import java.util.List;
import java.util.stream.Collectors;

/**
 * A simple utility class for mapping Entities to DTOs.
 * In a real-world enterprise application, consider using a dedicated mapping library like MapStruct
 * for more robust, compile-time checked, and efficient mapping.
 */
public class MapperUtil {

    public static UserDTO toUserDTO(User user) {
        if (user == null) return null;
        return UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .roles(user.getRoles().stream().map(role -> role.getName().name()).collect(Collectors.toSet()))
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    public static CategoryDTO toCategoryDTO(Category category) {
        if (category == null) return null;
        return CategoryDTO.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .build();
    }

    public static EventDTO toEventDTO(Event event) {
        if (event == null) return null;
        return EventDTO.builder()
                .id(event.getId())
                .title(event.getTitle())
                .description(event.getDescription())
                .location(event.getLocation())
                .startTime(event.getStartTime())
                .endTime(event.getEndTime())
                .totalCapacity(event.getTotalCapacity())
                .availableTickets(event.getAvailableTickets())
                .organizer(toUserDTO(event.getOrganizer()))
                .category(toCategoryDTO(event.getCategory()))
                .ticketTypes(event.getTicketTypes() != null ? event.getTicketTypes().stream().map(MapperUtil::toTicketTypeDTO).collect(Collectors.toList()) : null)
                .createdAt(event.getCreatedAt())
                .updatedAt(event.getUpdatedAt())
                .build();
    }

    public static TicketTypeDTO toTicketTypeDTO(TicketType ticketType) {
        if (ticketType == null) return null;
        return TicketTypeDTO.builder()
                .id(ticketType.getId())
                .name(ticketType.getName())
                .description(ticketType.getDescription())
                .price(ticketType.getPrice())
                .totalQuantity(ticketType.getTotalQuantity())
                .availableQuantity(ticketType.getAvailableQuantity())
                .eventId(ticketType.getEvent().getId())
                .build();
    }

    public static OrderDTO toOrderDTO(Order order) {
        if (order == null) return null;
        return OrderDTO.builder()
                .id(order.getId())
                .userId(order.getUser().getId())
                .orderDate(order.getOrderDate())
                .totalAmount(order.getTotalAmount())
                .status(order.getStatus().name())
                .items(order.getOrderItems().stream().map(MapperUtil::toOrderItemDTO).collect(Collectors.toList()))
                .build();
    }

    public static OrderItemDTO toOrderItemDTO(OrderItem item) {
        if (item == null) return null;
        return OrderItemDTO.builder()
                .id(item.getId())
                .ticketTypeId(item.getTicketType().getId())
                .ticketTypeName(item.getTicketType().getName())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .build();
    }
}
```