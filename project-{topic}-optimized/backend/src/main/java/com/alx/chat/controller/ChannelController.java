```java
package com.alx.chat.controller;

import com.alx.chat.dto.ChannelDto;
import com.alx.chat.dto.CreateChannelRequest;
import com.alx.chat.service.ChannelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for managing chat channels.
 * Handles API endpoints for /api/channels.
 */
@RestController
@RequestMapping("/api/channels")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Channels", description = "Channel management APIs")
@SecurityRequirement(name = "bearerAuth") // Requires JWT authentication for all endpoints in this controller
public class ChannelController {

    private final ChannelService channelService;

    /**
     * Creates a new chat channel.
     * @param request CreateChannelRequest containing channel name.
     * @param userDetails Authenticated user details.
     * @return ResponseEntity with the created ChannelDto.
     */
    @Operation(summary = "Create a new chat channel")
    @PostMapping
    public ResponseEntity<ChannelDto> createChannel(@Valid @RequestBody CreateChannelRequest request,
                                                  @AuthenticationPrincipal UserDetails userDetails) {
        log.info("User {} creating channel: {}", userDetails.getUsername(), request.getName());
        ChannelDto channel = channelService.createChannel(request.getName(), userDetails.getUsername());
        log.info("Channel {} created by user {}", channel.getName(), userDetails.getUsername());
        return new ResponseEntity<>(channel, HttpStatus.CREATED);
    }

    /**
     * Retrieves all available chat channels.
     * @return ResponseEntity with a list of ChannelDto.
     */
    @Operation(summary = "Get all available chat channels")
    @GetMapping
    public ResponseEntity<List<ChannelDto>> getAllChannels() {
        log.debug("Fetching all channels.");
        List<ChannelDto> channels = channelService.getAllChannels();
        log.debug("Fetched {} channels.", channels.size());
        return ResponseEntity.ok(channels);
    }

    /**
     * Retrieves a specific chat channel by its ID.
     * @param channelId The ID of the channel.
     * @return ResponseEntity with the ChannelDto.
     */
    @Operation(summary = "Get a chat channel by ID")
    @GetMapping("/{channelId}")
    public ResponseEntity<ChannelDto> getChannelById(@PathVariable Long channelId) {
        log.debug("Fetching channel with ID: {}", channelId);
        ChannelDto channel = channelService.getChannelById(channelId);
        log.debug("Fetched channel: {}", channel.getName());
        return ResponseEntity.ok(channel);
    }

    /**
     * Allows an authenticated user to join a specified channel.
     * @param channelId The ID of the channel to join.
     * @param userDetails Authenticated user details.
     * @return ResponseEntity with the updated ChannelDto (containing joined members).
     */
    @Operation(summary = "Join a chat channel")
    @PostMapping("/{channelId}/join")
    public ResponseEntity<ChannelDto> joinChannel(@PathVariable Long channelId,
                                                @AuthenticationPrincipal UserDetails userDetails) {
        log.info("User {} attempting to join channel ID: {}", userDetails.getUsername(), channelId);
        ChannelDto channel = channelService.joinChannel(channelId, userDetails.getUsername());
        log.info("User {} joined channel {}.", userDetails.getUsername(), channel.getName());
        return ResponseEntity.ok(channel);
    }

    /**
     * Retrieves all members of a specific channel.
     * @param channelId The ID of the channel.
     * @return ResponseEntity with a list of UserDto representing channel members.
     */
    @Operation(summary = "Get all members of a channel")
    @GetMapping("/{channelId}/members")
    public ResponseEntity<List<String>> getChannelMembers(@PathVariable Long channelId) {
        log.debug("Fetching members for channel ID: {}", channelId);
        List<String> members = channelService.getChannelMembers(channelId);
        log.debug("Fetched {} members for channel ID: {}", members.size(), channelId);
        return ResponseEntity.ok(members);
    }
}
```