```java
package com.alx.chat.service;

import com.alx.chat.dto.ChannelDto;
import com.alx.chat.entity.Channel;
import com.alx.chat.entity.ChannelMember;
import com.alx.chat.entity.User;
import com.alx.chat.exception.ResourceNotFoundException;
import com.alx.chat.exception.UserAlreadyExistsException;
import com.alx.chat.repository.ChannelMemberRepository;
import com.alx.chat.repository.ChannelRepository;
import com.alx.chat.repository.UserRepository;
import com.alx.chat.util.ChannelMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service for managing chat channels.
 * Handles creation, joining, retrieving channels and their members.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChannelService {

    private final ChannelRepository channelRepository;
    private final UserRepository userRepository;
    private final ChannelMemberRepository channelMemberRepository;
    private final ChannelMapper channelMapper;

    /**
     * Creates a new chat channel.
     * @param channelName The name of the channel to create.
     * @param creatorUsername The username of the user creating the channel.
     * @return ChannelDto representing the newly created channel.
     * @throws UserAlreadyExistsException if a channel with the same name already exists.
     * @throws ResourceNotFoundException if the creator user is not found.
     */
    @Transactional
    @CacheEvict(value = "channels", allEntries = true) // Evict all entries from 'channels' cache on create
    public ChannelDto createChannel(String channelName, String creatorUsername) {
        if (channelRepository.findByName(channelName).isPresent()) {
            log.warn("Attempted to create channel with existing name: {}", channelName);
            throw new UserAlreadyExistsException("Channel with name '" + channelName + "' already exists.");
        }

        User creator = userRepository.findByUsername(creatorUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Creator user not found: " + creatorUsername));

        Channel channel = Channel.builder()
                .name(channelName)
                .creator(creator)
                .createdAt(LocalDateTime.now())
                .build();

        Channel savedChannel = channelRepository.save(channel);
        log.info("Channel {} created by user {}.", savedChannel.getName(), creatorUsername);

        // Automatically join the creator to the channel
        ChannelMember creatorMembership = ChannelMember.builder()
                .user(creator)
                .channel(savedChannel)
                .joinedAt(LocalDateTime.now())
                .build();
        channelMemberRepository.save(creatorMembership);
        savedChannel.getMembers().add(creatorMembership); // Add to the entity's collection
        log.info("Creator {} automatically joined channel {}.", creatorUsername, savedChannel.getName());

        return channelMapper.toDto(savedChannel);
    }

    /**
     * Retrieves a channel by its ID.
     * @param channelId The ID of the channel.
     * @return ChannelDto representing the channel.
     * @throws ResourceNotFoundException if the channel is not found.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "channel", key = "#channelId") // Cache individual channel details
    public ChannelDto getChannelById(Long channelId) {
        log.debug("Fetching channel by ID: {}", channelId);
        Channel channel = channelRepository.findById(channelId)
                .orElseThrow(() -> new ResourceNotFoundException("Channel not found with ID: " + channelId));
        return channelMapper.toDto(channel);
    }

    /**
     * Retrieves all available channels.
     * @return A list of ChannelDto.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "channels") // Cache all channels list
    public List<ChannelDto> getAllChannels() {
        log.debug("Fetching all channels.");
        return channelRepository.findAll().stream()
                .map(channelMapper::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Allows a user to join an existing channel.
     * @param channelId The ID of the channel to join.
     * @param username The username of the user joining.
     * @return ChannelDto representing the updated channel.
     * @throws ResourceNotFoundException if the channel or user is not found.
     * @throws UserAlreadyExistsException if the user is already a member of the channel.
     */
    @Transactional
    @CacheEvict(value = {"channel", "channels"}, allEntries = true) // Evict specific channel and all channels list
    public ChannelDto joinChannel(Long channelId, String username) {
        Channel channel = channelRepository.findById(channelId)
                .orElseThrow(() -> new ResourceNotFoundException("Channel not found with ID: " + channelId));

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        if (channelMemberRepository.existsByUserIdAndChannelId(user.getId(), channelId)) {
            log.warn("User {} is already a member of channel {}", username, channel.getName());
            throw new UserAlreadyExistsException("User " + username + " is already a member of channel " + channel.getName());
        }

        ChannelMember channelMember = ChannelMember.builder()
                .user(user)
                .channel(channel)
                .joinedAt(LocalDateTime.now())
                .build();

        channelMemberRepository.save(channelMember);
        channel.getMembers().add(channelMember); // Update the entity's collection
        log.info("User {} joined channel {}.", username, channel.getName());

        return channelMapper.toDto(channel);
    }

    /**
     * Retrieves the usernames of all members of a specific channel.
     * @param channelId The ID of the channel.
     * @return A list of usernames.
     * @throws ResourceNotFoundException if the channel is not found.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "channelMembers", key = "#channelId") // Cache channel members list
    public List<String> getChannelMembers(Long channelId) {
        if (!channelRepository.existsById(channelId)) {
            throw new ResourceNotFoundException("Channel not found with ID: " + channelId);
        }
        return channelMemberRepository.findByChannelId(channelId).stream()
                .map(channelMember -> channelMember.getUser().getUsername())
                .collect(Collectors.toList());
    }

    /**
     * Checks if a user is a member of a given channel.
     * This method is used by Spring Security's @PreAuthorize annotation.
     * @param channelId The ID of the channel.
     * @param username The username to check.
     * @return True if the user is a member, false otherwise.
     */
    @Transactional(readOnly = true)
    public boolean isUserMemberOfChannel(Long channelId, String username) {
        return userRepository.findByUsername(username)
                .map(user -> channelMemberRepository.existsByUserIdAndChannelId(user.getId(), channelId))
                .orElse(false);
    }
}
```