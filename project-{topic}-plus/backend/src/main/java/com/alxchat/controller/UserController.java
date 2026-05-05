package com.alxchat.controller;

import com.alxchat.dto.UserDTO;
import com.alxchat.exception.ResourceNotFoundException;
import com.alxchat.model.User;
import com.alxchat.model.UserStatus;
import com.alxchat.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        return ResponseEntity.ok(UserDTO.fromEntity(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Long id) {
        User user = userService.getUserById(id);
        return ResponseEntity.ok(UserDTO.fromEntity(user));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<UserDTO> updateUserStatus(@PathVariable Long id, @RequestParam UserStatus status,
                                                    @AuthenticationPrincipal UserDetails userDetails) {
        // Ensure the authenticated user is updating their own status
        User currentUser = userService.getUserByUsername(userDetails.getUsername());
        if (!currentUser.getId().equals(id)) {
            throw new ResourceNotFoundException("Unauthorized to update another user's status.");
        }
        User updatedUser = userService.updateUserStatus(id, status);
        return ResponseEntity.ok(UserDTO.fromEntity(updatedUser));
    }
}