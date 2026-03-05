```java
package com.alx.chat.controller;

import com.alx.chat.dto.room.CreateRoomRequest;
import com.alx.chat.dto.room.RoomDto;
import com.alx.chat.service.RoomService;
import com.alx.chat.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/rooms")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Room Management", description = "Operations related to chat rooms")
public class RoomController {

    private final RoomService roomService;
    private final UserService userService; // To get user ID from UserDetails

    private Long getUserId(UserDetails userDetails) {
        return userService.getUserByUsername(userDetails.getUsername()).getId();
    }

    @PostMapping
    @Operation(summary = "Create a new chat room",
            description = "Creates a new chat room. The authenticated user will be set as the creator and automatically join the room.")
    public ResponseEntity<RoomDto> createRoom(@Valid @RequestBody CreateRoomRequest request,
                                              @AuthenticationPrincipal UserDetails userDetails) {
        Long creatorId = getUserId(userDetails);
        RoomDto createdRoom = roomService.createRoom(request, creatorId);
        return new ResponseEntity<>(createdRoom, HttpStatus.CREATED);
    }

    @GetMapping("/{roomId}")
    @Operation(summary = "Get room by ID",
            description = "Retrieves details of a specific chat room by its ID.")
    public ResponseEntity<RoomDto> getRoomById(@Parameter(description = "ID of the room to retrieve") @PathVariable Long roomId) {
        RoomDto room = roomService.getRoomById(roomId);
        return ResponseEntity.ok(room);
    }

    @GetMapping
    @Operation(summary = "Get all chat rooms",
            description = "Retrieves a paginated list of all available chat rooms.")
    public ResponseEntity<Page<RoomDto>> getAllRooms(@Parameter(description = "Pagination information") Pageable pageable) {
        return ResponseEntity.ok(roomService.getAllRooms(pageable));
    }

    @GetMapping("/my-rooms")
    @Operation(summary = "Get rooms the current user is a member of",
            description = "Retrieves a paginated list of chat rooms where the authenticated user is a member.")
    public ResponseEntity<Page<RoomDto>> getMyRooms(@AuthenticationPrincipal UserDetails userDetails,
                                                    @Parameter(description = "Pagination information") Pageable pageable) {
        Long userId = getUserId(userDetails);
        return ResponseEntity.ok(roomService.getRoomsByUserId(userId, pageable));
    }

    @DeleteMapping("/{roomId}")
    @Operation(summary = "Delete a chat room",
            description = "Deletes a chat room. Only the room creator can perform this action.")
    public ResponseEntity<Void> deleteRoom(@Parameter(description = "ID of the room to delete") @PathVariable Long roomId,
                                           @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = getUserId(userDetails);
        roomService.deleteRoom(roomId, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{roomId}/join")
    @Operation(summary = "Join a chat room",
            description = "Adds the authenticated user to the specified chat room as a member.")
    public ResponseEntity<RoomDto> joinRoom(@Parameter(description = "ID of the room to join") @PathVariable Long roomId,
                                            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = getUserId(userDetails);
        RoomDto updatedRoom = roomService.joinRoom(roomId, userId);
        return ResponseEntity.ok(updatedRoom);
    }

    @PostMapping("/{roomId}/leave")
    @Operation(summary = "Leave a chat room",
            description = "Removes the authenticated user from the specified chat room.")
    public ResponseEntity<RoomDto> leaveRoom(@Parameter(description = "ID of the room to leave") @PathVariable Long roomId,
                                             @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = getUserId(userDetails);
        RoomDto updatedRoom = roomService.leaveRoom(roomId, userId);
        return ResponseEntity.ok(updatedRoom);
    }
}
```